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


mediarenderer.setRendererListener = function(rendererCallback, errorCallback) {
	
	var rendererFoundCB = rendererCallback.onrendererfound;
	var rendererLostCB = rendererCallback.onrendererlost;
	
	function onRendererOk(proxy) {
		if (rendererFoundCB)
			rendererFoundCB(new mediarenderer.MediaRenderer(proxy));		
	}
	
	function onObjIdOk(id) {
		mediarenderer.bus.getObject(mediarenderer.busName, id, onRendererOk);
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
	return this;
};


mediarenderer.MediaController.prototype.mute = function(mute) {
	var self = this;
	
	function onMuteOk() {
		self.muted = mute;
	}
	
	this.renderer.proxy.Set("org.mpris.MediaPlayer2.Player", "Mute", mute, onMuteOk, cloudeebus.log);
};


mediarenderer.MediaController.prototype.play = function() {
	var self = this;
	
	function onPlayOk() {
		self.paused = false;
	}
	
	this.renderer.proxy.Play(onPlayOk, cloudeebus.log);
};


mediarenderer.MediaController.prototype.pause = function() {
	var self = this;
	
	function onPauseOk() {
		self.paused = true;
	}
	
	this.renderer.proxy.Pause(onPauseOk, cloudeebus.log);
};


mediarenderer.MediaController.prototype.stop = function() {
	var self = this;

	function onStopOk() {
		self.paused = true;
	}
	
	this.renderer.proxy.Stop(onStopOk, cloudeebus.log);
};


mediarenderer.MediaController.prototype.next = function() {
	this.renderer.proxy.Next();
	this.track++;
};


mediarenderer.MediaController.prototype.previous = function() {
	this.renderer.proxy.Previous();
	this.track--;
};


mediarenderer.MediaController.prototype.setVolume = function(vol) {
	var self = this;
	var volNum = Math.max(0,Math.min(0.99,Number(vol)));
	
	function onSetVolumeOk() {
		self.volume = volNum;
	}
	
	this.renderer.proxy.Set("org.mpris.MediaPlayer2.Player", "Volume", volNum, onSetVolumeOk, cloudeebus.log);
};


mediarenderer.MediaController.prototype.gotoTrack = function(track) {
	var self = this;
	var trackNum = Number(track);
	
	function onGotoTrackOk() {
		self.track = trackNum;
	}
	
	this.renderer.proxy.GotoTrack(trackNum, onGotoTrackOk, cloudeebus.log);
};


mediarenderer.MediaController.prototype.seek = function(secOffset) {
	this.renderer.proxy.Seek(Number(secOffset) * 1000000);
};



/*****************************************************************************/

mediarenderer.MediaRenderer = function(proxy) {
	this.proxy = proxy;
	if (proxy) {
		this.id = proxy.objectPath;
		this.friendlyName = proxy.Identity;
		this.protocolInfo = proxy.ProtocolInfo;
	}
	this.controller = new mediarenderer.MediaController(this);
	return this;
};


mediarenderer.MediaRenderer.prototype.openURI = function(mediaURI, metaData, successCallback, errorCallback) {
	if (metaData)
		this.proxy.OpenUriEx(mediaURI, metaData, successCallback, errorCallback);
	else
		this.proxy.OpenUri(mediaURI, successCallback, errorCallback);
};

