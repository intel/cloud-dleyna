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

mediaserver.reset = function() {
	mediaserver.busName = "com.intel.media-service-upnp";
	mediaserver.bus = null;
	mediaserver.uri = null;
	mediaserver.manager = null;
};


mediaserver.init = function(uri, manifest, successCB, errorCB) {
	mediaserver.reset();
	
	function onManagerOk(proxy) {
		// Use LAN addresses in case there is a remote renderer
		proxy.PreferLocalAddresses(false);
		if (successCB)
			successCB();		
	}
	
	function onConnectOk() {
		mediaserver.bus = cloudeebus.SessionBus();
		mediaserver.uri = uri;
		mediaserver.manager = mediaserver.bus.getObject(mediaserver.busName, "/com/intel/MediaServiceUPnP", onManagerOk, errorCB);
	}
	
	cloudeebus.connect(uri, manifest, onConnectOk, errorCB);
};


mediaserver.setServerListener = function(serverCallback, errorCallback) {
	
	var serverFoundCB = serverCallback.onserverfound;
	var serverLostCB = serverCallback.onserverlost;
	
	function onServerOk(proxy) {
		if (serverFoundCB)
			serverFoundCB(new mediaserver.MediaServer(proxy));		
	}
	
	function onObjIdOk(id) {
		mediaserver.bus.getObject(mediaserver.busName, id, onServerOk, errorCallback);
	}
	
	function onObjIdsOk(ids) {
		for (var i=0; i<ids.length; i++)
			onObjIdOk(ids[i]);
	}
	
	mediaserver.manager.GetServers(onObjIdsOk, errorCallback);
	mediaserver.manager.connectToSignal("com.intel.MediaServiceUPnP.Manager", "FoundServer",
			onObjIdOk, errorCallback);
	mediaserver.manager.connectToSignal("com.intel.MediaServiceUPnP.Manager", "LostServer",
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
		// proxy has a root folder if it implements MediaObject2
		if (proxy.DisplayName) {
			this.root = new mediacontent.MediaContainer(proxy);
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
		var objArray = [];
		for (var i=0; i<jsonArray.length; i++)
			objArray.push(mediacontent.mediaObjectForProps(jsonArray[i]));
		if (successCallback)
			successCallback(objArray);
	}

	var containerProxy = mediaserver.bus.getObject(mediaserver.busName, id);
	containerProxy.callMethod("org.gnome.UPnP.MediaContainer2", "ListChildrenEx", 
		[
			offset ? offset : 0, 
			count ? count : 0, 
			mediaserver.browseFilter, 
			sortStr
		],
		onMediaObjectsOk,
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

	function onMediaObjectsOk(jsonArray) {
		var objArray = [];
		for (var i=0; i<jsonArray.length; i++)
			objArray.push(mediacontent.mediaObjectForProps(jsonArray[i]));
		if (successCallback)
			successCallback(objArray);
	}

	var containerProxy = mediaserver.bus.getObject(mediaserver.busName, id);
	containerProxy.callMethod("org.gnome.UPnP.MediaContainer2", "SearchObjectsEx", 
		[
			query ? query : "*",
			offset ? offset : 0, 
			count ? count : 0, 
			mediaserver.browseFilter, 
			sortStr
		],
		onMediaObjectsOk,
		errorCallback);
};


mediaserver.MediaServer.prototype.upload = function(title, path, successCallback, errorCallback) {
	this.proxy.UploadToAnyContainer(title, path, successCallback, errorCallback);
};

