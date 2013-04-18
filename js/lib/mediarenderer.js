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
	mediarenderer.busName = "com.intel.dleyna-renderer";
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
		mediarenderer.manager = mediarenderer.bus.getObject(mediarenderer.busName, "/com/intel/dLeynaRenderer", onManagerOk);
	}
	
	cloudeebus.connect(uri, manifest, onConnectOk, errorCB);
};


mediarenderer.rescan = function() {
	mediarenderer.manager.Rescan();
};


mediarenderer.setRendererListener = function(rendererCallback, errorCallback) {
	
	var rendererFoundCB = rendererCallback.onrendererfound;
	var rendererLostCB = rendererCallback.onrendererlost;
	
	function onRendererOk(proxy) {
		if (rendererFoundCB)
			rendererFoundCB(new mediarenderer.MediaRenderer(proxy));
	}
	
	function onObjIdOk(id) {
		var proxy = mediarenderer.bus.getObject(mediarenderer.busName, id);
		proxy.callMethod("org.freedesktop.DBus.Properties", "Get", ["org.mpris.MediaPlayer2", "Identity"],
			function() {
				mediarenderer.bus.getObject(mediarenderer.busName, id, onRendererOk);
			}
		);
	}
	
	function onObjIdsOk(ids) {
		for (var i=0; i<ids.length; i++)
			onObjIdOk(ids[i]);
	}
	
	mediarenderer.manager.GetServers(onObjIdsOk, errorCallback);
	mediarenderer.manager.connectToSignal("com.intel.dLeynaRenderer.Manager", "FoundServer",
			onObjIdOk, errorCallback);
	mediarenderer.manager.connectToSignal("com.intel.dLeynaRenderer.Manager", "LostServer",
			rendererLostCB, errorCallback);
};



/*****************************************************************************/

mediarenderer.MediaController = function(renderer) {
	this.renderer = renderer;
	this.paused = true;
	this.muted = renderer.proxy.Mute == undefined ? false : renderer.proxy.Mute;
	this.volume = renderer.proxy.Volume == undefined ? 1 : Number(renderer.proxy.Volume);
	this.track = renderer.proxy.CurrentTrack == undefined ? 1 : Number(renderer.proxy.CurrentTrack);
	this.speed = renderer.proxy.Rate;
	this.playSpeeds = renderer.proxy.TransportPlaySpeeds;
	return this;
};


mediarenderer.MediaController.prototype.mute = function(mute) {
	this.renderer.proxy.Set("org.mpris.MediaPlayer2.Player", "Mute", mute);
};


mediarenderer.MediaController.prototype.play = function() {
	this.renderer.proxy.Play();
};


mediarenderer.MediaController.prototype.pause = function() {
	this.renderer.proxy.Pause();
};


mediarenderer.MediaController.prototype.stop = function() {
	this.renderer.proxy.Stop();
};


mediarenderer.MediaController.prototype.next = function() {
	this.renderer.proxy.Next();
};


mediarenderer.MediaController.prototype.previous = function() {
	this.renderer.proxy.Previous();
};


mediarenderer.MediaController.prototype.setVolume = function(vol) {
	var argStr = String(vol);
	if (argStr.indexOf(".") == -1)
		argStr += ".0";
	var proxy = this.renderer.proxy;
	var arglist = [
	       		proxy.busConnection.name,
	       		proxy.busName,
	       		proxy.objectPath,
	       		"org.freedesktop.DBus.Properties",
	       		"Set",
	       		"[\"org.mpris.MediaPlayer2.Player\",\"Volume\"," + argStr + "]"
	       	];
	proxy.wampSession.call("dbusSend", arglist);
};


mediarenderer.MediaController.prototype.setSpeed = function(speed) {
	var argStr = String(speed);
	if (argStr.indexOf(".") == -1)
		argStr += ".0";
	var proxy = this.renderer.proxy;
	var arglist = [
	       		proxy.busConnection.name,
	       		proxy.busName,
	       		proxy.objectPath,
	       		"org.freedesktop.DBus.Properties",
	       		"Set",
	       		"[\"org.mpris.MediaPlayer2.Player\",\"Rate\"," + argStr + "]"
	       	];
	proxy.wampSession.call("dbusSend", arglist);
};


mediarenderer.MediaController.prototype.gotoTrack = function(track) {
	this.renderer.proxy.GotoTrack(Number(track));
};


mediarenderer.MediaController.prototype.seek = function(secOffset) {
	this.renderer.proxy.Seek(Number(secOffset) * 1000000);
};



/*****************************************************************************/

mediarenderer.MediaRenderer = function(proxy) {
	this.proxy = proxy;
	this.controller = new mediarenderer.MediaController(this);
	if (proxy) {
		this.id = proxy.objectPath;
		this.friendlyName = proxy.Identity;
		this.protocolInfo = proxy.ProtocolInfo;
		proxy.controller = this.controller;
		proxy.connectToSignal("org.freedesktop.DBus.Properties","PropertiesChanged", 
			function(iface, changed, invalidated) {
				if (changed.CurrentTrack != undefined)
					this.controller.track = changed.CurrentTrack;
				if (changed.Volume != undefined)
					this.controller.volume = changed.Volume;
				if (changed.Mute != undefined)
					this.controller.muted = changed.Mute;
				if (changed.PlaybackStatus != undefined) 
					this.controller.paused = changed.PlaybackStatus != "Playing";
				if (changed.Rate != undefined) 
					this.controller.speed = changed.Rate;
				if (changed.TransportPlaySpeeds != undefined) 
					this.controller.playSpeeds = changed.TransportPlaySpeeds;
				if (this.controller.onchange)
					this.controller.onchange.apply(this.controller);
			}, cloudeebus.log);
	}
	return this;
};


mediarenderer.MediaRenderer.prototype.openURI = function(mediaURI, metaData, successCallback, errorCallback) {
	if (metaData)
		this.proxy.OpenUriEx(mediaURI, metaData, successCallback, errorCallback);
	else
		this.proxy.OpenUri(mediaURI, successCallback, errorCallback);
};
