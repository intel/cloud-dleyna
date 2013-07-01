/******************************************************************************
 * Copyright 2012 Intel Corporation.
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 * http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *****************************************************************************/



/*****************************************************************************/

var mediaserver = window.mediaserver = {};

mediaserver._reset = function() {
	mediaserver._busName = "com.intel.dleyna-server";
	mediaserver._bus = null;
	mediaserver._uri = null;
	mediaserver._manager = null;
};


mediaserver._init = function(uri, manifest) {
	mediaserver._reset();
		
	var promise = new cloudeebus.Promise(function (resolver) {
		function onManagerOk(proxy) {
			// Use LAN addresses in case there is a remote renderer
			proxy.PreferLocalAddresses(false);
			resolver.fulfill();
		}
		
		function onConnectOk() {
			mediaserver._bus = cloudeebus.SessionBus();
			mediaserver._uri = uri;
			mediaserver._manager = mediaserver._bus.getObject(mediaserver._busName, "/com/intel/dLeynaServer", onManagerOk, onerror);
		}
		
		function onerror(error) {
			cloudeebus.log("MediaServer init error: " + error);
			resolver.reject(error, true);			
		}
		
		cloudeebus.connect(uri, manifest, onConnectOk, onerror);
	});
	
	return promise;
};


mediaserver.rescan = function() {
	mediaserver._manager.Rescan();
};


mediaserver.setProtocolInfo = function(protocolInfo) {
	mediaserver._manager.SetProtocolInfo(protocolInfo);
}


mediaserver.setServerListener = function(serverCallback, errorCallback) {
	
	var serverFoundCB = serverCallback.onserverfound;
	var serverLostCB = serverCallback.onserverlost;
	
	function onServerOk(proxy) {
		if (serverFoundCB)
			serverFoundCB(new mediaserver.MediaServer(proxy));
	}
	
	function onObjIdOk(id) {
		var proxy = mediaserver._bus.getObject(mediaserver._busName, id);
		var countCallDone = function() {
				mediaserver._bus.getObject(mediaserver._busName, id, onServerOk);
			};
		proxy.callMethod("org.freedesktop.DBus.Properties", "Get", ["org.gnome.UPnP.MediaObject2", "ChildCount"]).then(
		  countCallDone, countCallDone);
	}
	
	function onObjIdsOk(ids) {
		for (var i=0; i<ids.length; i++)
			onObjIdOk(ids[i]);
	}
	mediaserver._manager.GetServers().then(onObjIdsOk, errorCallback);
	mediaserver._manager.connectToSignal("com.intel.dLeynaServer.Manager", "FoundServer",
			onObjIdOk, errorCallback);
	mediaserver._manager.connectToSignal("com.intel.dLeynaServer.Manager", "LostServer",
			serverLostCB, errorCallback);
};



/*****************************************************************************/

mediaserver.MediaServer = function(proxy) {
	this.proxy = proxy;
	if (proxy) {
		this.id = proxy.objectPath;
		this.friendlyName = proxy.FriendlyName;
		this.manufacturer = proxy.Manufacturer;
		this.manufacturerURL = proxy.ManufacturerUrl;
		this.modelDescription = proxy.ModelDescription;
		this.modelName = proxy.ModelName;
		this.modelNumber = proxy.ModelNumber;
		this.modelURL = proxy.ModelURL;
		this.serialNumber = proxy.SerialNumber;
		this.UPC = proxy.UDN;
		this.presentationURL = proxy.PresentationURL;
		this.iconURL = proxy.IconURL;
		// proxy has a root folder if it implements MediaContainer2
		if (proxy.ChildCount) {
			this.root = new mediacontent.MediaContainer(proxy);
			if (!this.root.title)
			  this.root.title = this.friendlyName;
		}
	}
	return this;
};


mediaserver.browseFilter = [
	"Path",
	"Type",
	"DisplayName",
	"URLs",
	"MIMEType",
	"Date",
	"Size",
	"Width",
	"Height",
	"Duration",
	"Bitrate",
	"Album",
	"Artist",
	"Genre"
];

mediaserver.containerGetPropertiesDeferred = function(container) {
	var obj = container;
	obj.proxy.callMethod("org.freedesktop.DBus.Properties", "Get",
		[
			"org.gnome.UPnP.MediaContainer2", 
			"ChildCount"
		]).then(
		function (ChildCount) {
			obj.childCount = ChildCount;
		});
	obj.proxy.callMethod("org.freedesktop.DBus.Properties", "Get",
		[
			"org.gnome.UPnP.MediaObject2", 
			"DLNAManaged"
		]).then(
		function (DLNAManaged) {
			if (DLNAManaged.CreateContainer)
				obj.canCreateContainer = true;
			if (DLNAManaged.Delete)
				obj.canDelete = true;
			if (DLNAManaged.Upload)
				obj.canUpload = true;
			if (DLNAManaged.ChangeMeta)
				obj.canRename = true;
		});
}

mediaserver.mediaObjectsOkCallback = function(jsonArray, successCallback) {
	var objArray = [];
	for (var i=0; i<jsonArray.length; i++) {
		var obj = mediacontent.mediaObjectForProps(jsonArray[i]);
		obj.proxy = mediaserver._bus.getObject(mediaserver._busName, obj.id);
		if (obj.type == "container") 
			mediaserver.containerGetPropertiesDeferred(obj);
		objArray.push(obj);
	}
	if (successCallback)
		successCallback(objArray);
};


mediaserver.MediaServer.prototype.browse = function(id, successCallback, errorCallback, sortMode, count, offset) {

	var sortStr = "";
	if (sortMode) {
		if (sortMode.order == "ASC")
			sortStr = "+";
		else
			sortStr = "-";
		sortStr += sortMode.attributeName;
	}

	function onMediaObjectsOk(jsonArray) {
		resultArray = resultArray.concat(jsonArray);
		if (count) { // user wanted a partial result set, try to build it
			if (resultArray.length >= count || jsonArray.length == 0 ||
					(containerProxy.ChildCount && offset + resultArray.length >= containerProxy.ChildCount))
				mediaserver.mediaObjectsOkCallback(resultArray,successCallback);
			else {
				localOffset += jsonArray.length;
				localCount -= jsonArray.length;
				browseContainerProxy();
			}
		}
		else { // user wanted everything, iterate until there's no result left
			if (jsonArray.length == 0 ||
					(containerProxy.ChildCount && offset + resultArray.length >= containerProxy.ChildCount))
				mediaserver.mediaObjectsOkCallback(resultArray,successCallback);
			else {
				localOffset += jsonArray.length;
				browseContainerProxy();
			}
		}
	}

	function browseContainerProxy() {
		containerProxy.callMethod("org.gnome.UPnP.MediaContainer2", "ListChildrenEx", 
		[
			localOffset, 
			localCount, 
			mediaserver.browseFilter, 
			sortStr
		]).then(
		onMediaObjectsOk,
		errorCallback);
	}

	var resultArray = [];
	var localCount = count ? count : 0;
	var localOffset = offset ? offset : 0;
	var containerProxy = mediaserver._bus.getObject(mediaserver._busName, id);
	containerProxy.callMethod("org.freedesktop.DBus.Properties", "Get",
		[
			"org.gnome.UPnP.MediaContainer2", 
			"ChildCount"
		]).then(
		function (ChildCount) {
			containerProxy.ChildCount = ChildCount;
			browseContainerProxy();
		},
		errorCallback);		
};


mediaserver.MediaServer.prototype.find = function(id, successCallback, errorCallback, query, sortMode, count, offset) {

	var sortStr = "";
	if (sortMode) {
		if (sortMode.order == "ASC")
			sortStr = "+";
		else
			sortStr = "-";
		sortStr += sortMode.attributeName;
	}

	function onMediaObjectsOk(jsonArray, total) {
		resultArray = resultArray.concat(jsonArray);
		if (count) { // user wanted a partial result set, try to build it
			if (resultArray.length >= count || jsonArray.length == 0 ||
					(total && offset + resultArray.length >= total))
				mediaserver.mediaObjectsOkCallback(resultArray,successCallback);
			else {
				localOffset += jsonArray.length;
				localCount -= jsonArray.length;
				searchContainerProxy();
			}
		}
		else { // user wanted everything, iterate until there's no result left
			if (jsonArray.length == 0 || (total && offset + resultArray.length >= total))
				mediaserver.mediaObjectsOkCallback(resultArray,successCallback);
			else {
				localOffset += jsonArray.length;
				searchContainerProxy();
			}
		}
	}

	function searchContainerProxy() {
		containerProxy.callMethod("org.gnome.UPnP.MediaContainer2", "SearchObjectsEx", 
		[
			query ? query : "*",
			localOffset, 
			localCount, 
			mediaserver.browseFilter, 
			sortStr
		]).then(
		onMediaObjectsOk,
		errorCallback);
	}

	var resultArray = [];
	var localCount = count ? count : 0;
	var localOffset = offset ? offset : 0;
	var containerProxy = mediaserver._bus.getObject(mediaserver._busName, id);
	searchContainerProxy();
};


mediaserver.MediaServer.prototype.upload = function(title, path, successCallback, errorCallback) {
	this.proxy.UploadToAnyContainer(title, path).then(successCallback, errorCallback);
};


mediaserver.MediaServer.prototype.createFolder = function(title, successCallback, errorCallback) {
	this.proxy.CreateContainerInAnyContainer(title, "container", ["*"]).then(successCallback, errorCallback);
};


