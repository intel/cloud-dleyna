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

var dleyna = window.dleyna = {};

dleyna.reset = function() {
	dleyna.busName = "com.intel.media-service-upnp";
	dleyna.bus = null;
	dleyna.uri = null;
	dleyna.manager = null;
};


dleyna.init = function(uri, manifest, successCB, errorCB) {
	dleyna.reset();
	
	function onManagerOk() {
		if (successCB)
			successCB();		
	}
	
	function onConnectOk() {
		dleyna.bus = cloudeebus.SessionBus();
		dleyna.uri = uri;
		dleyna.manager = dleyna.bus.getObject(dleyna.busName, "/com/intel/MediaServiceUPnP", onManagerOk, errorCB);
	}
	
	cloudeebus.connect(uri, manifest, onConnectOk, errorCB);
};


dleyna.setServerListener = function(serverCallback, errorCallback) {
	
	var serverFoundCB = serverCallback.onserverfound;
	var serverLostCB = serverCallback.onserverlost;
	
	function onServerOk(proxy) {
		if (serverFoundCB)
			serverFoundCB(new dleyna.MediaServer(proxy));		
	}
	
	function onObjIdOk(id) {
		dleyna.bus.getObject(dleyna.busName, id, onServerOk, errorCallback);
	}
	
	function onObjIdsOk(ids) {
		for (var i=0; i<ids.length; i++)
			onObjIdOk(ids[i]);
	}
	
	dleyna.manager.GetServers(onObjIdsOk, errorCallback);
	dleyna.manager.connectToSignal("com.intel.MediaServiceUPnP.Manager", "FoundServer",
			onObjIdOk, errorCallback);
	dleyna.manager.connectToSignal("com.intel.MediaServiceUPnP.Manager", "LostServer",
			serverLostCB, errorCallback);
};



/*****************************************************************************/

dleyna.MediaServer = function(proxy) {
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
		this.UPC = null;
		this.presentationURL = proxy.PresentationURL;
		// proxy has a root folder if it implements MediaObject2
		if (proxy.DisplayName) {
			this.root = new dleyna.MediaContainer(proxy);
		}
	}
	return this;
};


dleyna.browseFilter = [
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


dleyna.MediaServer.prototype.browse = function(id, successCallback, errorCallback, sortMode, count, offset) {

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
			objArray.push(dleyna.mediaObjectForProxy(jsonArray[i]));
		if (successCallback)
			successCallback(objArray);
	}

	var containerProxy = dleyna.bus.getObject(dleyna.busName, id);
	containerProxy.callMethod("org.gnome.UPnP.MediaContainer2", "ListChildrenEx", 
		[
			offset ? offset : 0, 
			count ? count : 0, 
			dleyna.browseFilter, 
			sortStr
		],
		onMediaObjectsOk,
		errorCallback);
};


dleyna.MediaServer.prototype.find = function(id, successCallback, errorCallback, query, sortMode, count, offset) {

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
			objArray.push(dleyna.mediaObjectForProxy(jsonArray[i]));
		if (successCallback)
			successCallback(objArray);
	}

	var containerProxy = dleyna.bus.getObject(dleyna.busName, id);
	containerProxy.callMethod("org.gnome.UPnP.MediaContainer2", "SearchObjectsEx", 
		[
			query ? query : "*",
			offset ? offset : 0, 
			count ? count : 0, 
			dleyna.browseFilter, 
			sortStr
		],
		onMediaObjectsOk,
		errorCallback);
};




/*****************************************************************************/

dleyna.MediaObject = function(proxy) {
	this.proxy = proxy;
	if (proxy) {
		this.id = proxy.Path;
		this.type = proxy.Type;
		this.displayName = proxy.DisplayName;
	}
	return this;
};



/*****************************************************************************/

dleyna.MediaContainer = function(proxy) {
	dleyna.MediaObject.call(this,proxy);
	this.type = "container";
	return this;
};

dleyna.MediaContainer.prototype = new dleyna.MediaObject();
dleyna.MediaContainer.prototype.constructor = dleyna.MediaContainer;



/*****************************************************************************/

dleyna.MediaItem = function(proxy) {
	dleyna.MediaObject.call(this,proxy);
	if (proxy) {
		this.mimeType = proxy.MIMEType;
		this.URLs = proxy.URLs;
		this.size = proxy.Size;
	}
	return this;
};

dleyna.MediaItem.prototype = new dleyna.MediaObject();
dleyna.MediaItem.prototype.constructor = dleyna.MediaItem;



/*****************************************************************************/

dleyna.MediaVideo = function(proxy) {
	dleyna.MediaItem.call(this,proxy);
	this.type = "video";
	if (proxy) {
		this.album = proxy.Album;
		this.artist = proxy.Artist;
		this.duration = proxy.Duration;
		this.width = proxy.Width;
		this.height = proxy.Height;
	}
	return this;
};

dleyna.MediaVideo.prototype = new dleyna.MediaItem();
dleyna.MediaVideo.prototype.constructor = dleyna.MediaVideo;



/*****************************************************************************/

dleyna.MediaAudio = function(proxy) {
	dleyna.MediaItem.call(this,proxy);
	this.type = "audio";
	if (proxy) {
		this.album = proxy.Album;
		this.genre = proxy.Genre;
		this.artist = proxy.Artist;
		this.bitrate = proxy.Bitrate;
		this.duration = proxy.Duration;
	}
	return this;
};

dleyna.MediaAudio.prototype = new dleyna.MediaItem();
dleyna.MediaAudio.prototype.constructor = dleyna.MediaAudio;



/*****************************************************************************/

dleyna.MediaImage = function(proxy) {
	dleyna.MediaItem.call(this,proxy);
	this.type = "image";
	if (proxy) {
		this.width = proxy.Width;
		this.height = proxy.Height;
	}
	return this;
};

dleyna.MediaImage.prototype = new dleyna.MediaItem();
dleyna.MediaImage.prototype.constructor = dleyna.MediaImage;



/*****************************************************************************/

dleyna.mediaObjectForProxy = function(proxy) {
	if (proxy.Type.indexOf("container") == 0)
		return new dleyna.MediaContainer(proxy);
	if (proxy.Type.indexOf("video") == 0)
		return new dleyna.MediaVideo(proxy);
	if (proxy.Type.indexOf("audio") == 0)
		return new dleyna.MediaAudio(proxy);
	if (proxy.Type.indexOf("image") == 0)
		return new dleyna.MediaImage(proxy);
	return new dleyna.MediaItem(proxy);
};



