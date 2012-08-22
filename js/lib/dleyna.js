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


dleyna.init = function(uri, successCB, errorCB) {
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
	
	cloudeebus.connect(uri, onConnectOk, errorCB);
};


dleyna.getServers = function(successCB, errorCB) {
	
	function onServerOk(obj) {
		if (successCB)
			successCB(new dleyna.MediaServer(obj));		
	}
	
	function onObjIdsOk(ids) {
		for (var i=0; i<ids.length; i++)
			dleyna.bus.getObject(dleyna.busName, ids[i], onServerOk, errorCB);
	}
	
	dleyna.manager.getServers(onObjIdsOk, errorCB);
};


dleyna.setServerListener = function(serverCallback, errorCallback) {
};



/*****************************************************************************/

dleyna.MediaServer = function(proxy) {
	this.proxy = proxy;
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
	return this;
};



/*****************************************************************************/

dleyna.MediaObject = function(proxy) {
	this.proxy = proxy;
	this.id = proxy.objectPath;
	this.type = proxy.Type;
	this.displayName = proxy.DisplayName;
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
	this.mimeType = proxy.MIMEType;
	this.URLs = proxy.URLs;
	this.size = proxy.Size;
	return this;
};

dleyna.MediaItem.prototype = new dleyna.MediaObject();
dleyna.MediaItem.prototype.constructor = dleyna.MediaItem;



/*****************************************************************************/

dleyna.MediaVideo = function(proxy) {
	dleyna.MediaItem.call(this,proxy);
	this.type = "video";
	this.album = proxy.Album;
	this.artist = proxy.Artist;
	this.duration = proxy.Duration;
	this.width = proxy.Width;
	this.height = proxy.Height;
	return this;
};

dleyna.MediaVideo.prototype = new dleyna.MediaItem();
dleyna.MediaVideo.prototype.constructor = dleyna.MediaVideo;



/*****************************************************************************/

dleyna.MediaAudio = function(proxy) {
	dleyna.MediaItem.call(this,proxy);
	this.type = "audio";
	this.album = proxy.Album;
	this.genre = proxy.Genre;
	this.artist = proxy.Artist;
	this.bitrate = proxy.Bitrate;
	this.duration = proxy.Duration;
	return this;
};

dleyna.MediaAudio.prototype = new dleyna.MediaItem();
dleyna.MediaAudio.prototype.constructor = dleyna.MediaAudio;



/*****************************************************************************/

dleyna.MediaImage = function(proxy) {
	dleyna.MediaItem.call(this,proxy);
	this.type = "image";
	this.width = proxy.Width;
	this.height = proxy.Height;
	return this;
};

dleyna.MediaImage.prototype = new dleyna.MediaItem();
dleyna.MediaImage.prototype.constructor = dleyna.MediaImage;




