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

var mediarenderer = window.mediarenderer = {};

mediarenderer.reset = function() {
	mediarenderer.busName = "com.intel.renderer-service-upnp";
	mediarenderer.bus = null;
	mediarenderer.uri = null;
	mediarenderer.manager = null;
};


mediarenderer.init = function(uri, manifest, successCB, errorCB) {
	mediarenderer.reset();
	
	function onManagerOk() {
		if (successCB)
			successCB();		
	}
	
	function onConnectOk() {
		mediarenderer.bus = cloudeebus.SessionBus();
		mediarenderer.uri = uri;
		mediarenderer.manager = mediarenderer.bus.getObject(mediarenderer.busName, "/com/intel/RendererServiceUPnP", onManagerOk, errorCB);
	}
	
	cloudeebus.connect(uri, manifest, onConnectOk, errorCB);
};


mediarenderer.setRendererListener = function(rendererCallback, errorCallback) {
	
	var rendererFoundCB = rendererCallback.onrendererfound;
	var rendererLostCB = rendererCallback.onrendererlost;
	
	function onRendererOk(proxy) {
		if (rendererFoundCB)
			rendererFoundCB(new mediarenderer.MediaRenderer(proxy));		
	}
	
	function onObjIdOk(id) {
		mediarenderer.bus.getObject(mediarenderer.busName, id, onRendererOk, errorCallback);
	}
	
	function onObjIdsOk(ids) {
		for (var i=0; i<ids.length; i++)
			onObjIdOk(ids[i]);
	}
	
	mediarenderer.manager.GetServers(onObjIdsOk, errorCallback);
	mediarenderer.manager.connectToSignal("com.intel.RendererServiceUPnP.Manager", "FoundServer",
			onObjIdOk, errorCallback);
	mediarenderer.manager.connectToSignal("com.intel.RendererServiceUPnP.Manager", "LostServer",
			rendererLostCB, errorCallback);
};



/*****************************************************************************/

mediarenderer.MediaRenderer = function(proxy) {
	this.proxy = proxy;
	if (proxy) {
		this.id = proxy.objectPath;
		this.friendlyName = proxy.Identity;
	}
	return this;
};


mediarenderer.MediaRenderer.prototype.openURI = function(mediaURI, successCallback, errorCallback) {
	this.proxy.OpenUri(mediaURI, successCallback, errorCallback);
};


