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

mediarenderer._reset = function() {
	mediarenderer._busName = "com.intel.dleyna-renderer";
	mediarenderer._bus = null;
	mediarenderer._uri = null;
	mediarenderer._manager = null;
};


mediarenderer._init = function(uri, manifest) {
	mediarenderer._reset();
	
	var promise = new cloudeebus.Promise(function (resolver) {
		function onManagerOk(proxy) {
			// Register mediarenderer._manager proxy for found / lost renderers
			proxy.connectToSignal("com.intel.dLeynaRenderer.Manager", "FoundRenderer",
					mediarenderer._foundRendererId, onerror);
			proxy.connectToSignal("com.intel.dLeynaRenderer.Manager", "LostRenderer",
					mediarenderer._lostRendererId, onerror);
			// promise fulfilled
			resolver.fulfill();
		}
		
		function onConnectOk() {
			mediarenderer._bus = cloudeebus.SessionBus();
			mediarenderer._uri = uri;
			mediarenderer._manager = mediarenderer._bus.getObject(mediarenderer._busName, "/com/intel/dLeynaRenderer", onManagerOk, onerror);
		}
		
		function onerror(error) {
			cloudeebus.log("MediaRenderer init error: " + error);
			resolver.reject(error, true);			
		}
		
		cloudeebus.connect(uri, manifest, onConnectOk, onerror);
	});
	
	// First network scan for media renderers once initialization done
	return promise.then(mediarenderer.scanNetwork, onerror);
};


mediarenderer._rendererProxyIntrospected = function(proxy) {
	if (mediarenderer.onrendererfound)
		mediarenderer.onrendererfound.call(mediarenderer, {
				type: "rendererfound",
				renderer: new mediarenderer.MediaRenderer(proxy)
			});
}


mediarenderer._foundRendererId = function(id) {
	var proxy = mediarenderer._bus.getObject(mediarenderer._busName, id);
	// <appeasement - UPnP & DLNA certification tools>
	proxy.callMethod("org.freedesktop.DBus.Properties", "Get", ["org.mpris.MediaPlayer2", "Identity"]).then(
			function() {
				mediarenderer._bus.getObject(mediarenderer._busName, id, mediarenderer._rendererProxyIntrospected);
			});
	// </appeasement>
}


mediarenderer._lostRendererId = function(id) {
	if (mediarenderer.onrendererlost)
		mediarenderer.onrendererlost.call(mediarenderer, {
				type: "rendererlost",
				id: id
			});
}


mediarenderer.scanNetwork = function() {
	function onObjIdsOk(ids) {
		for (var i=0; i<ids.length; i++)
			mediarenderer._foundRendererId(ids[i]);
	}
	
	function onerror(error) {
		cloudeebus.log("MediaRenderer scanNetwork error: " + error);
	}
	
	mediarenderer._manager.GetRenderers().then(onObjIdsOk, onerror);
	mediarenderer._manager.Rescan();
};



/*****************************************************************************/

mediarenderer.MediaController = function(renderer) {
	this.renderer = renderer;
	this.playbackStatus = renderer.proxy.PlaybackStatus == undefined ? "stopped" : renderer.proxy.PlaybackStatus.toLowerCase();
	this.muted = renderer.proxy.Mute == undefined ? false : renderer.proxy.Mute;
	this.volume = renderer.proxy.Volume == undefined ? 1 : Number(renderer.proxy.Volume);
	this.track = renderer.proxy.CurrentTrack == undefined ? 1 : Number(renderer.proxy.CurrentTrack);
	this.speed = renderer.proxy.Rate;
	this.playSpeeds = renderer.proxy.TransportPlaySpeeds;
	return this;
};


mediarenderer.MediaController.prototype.mute = function(mute) {
	return this.renderer.proxy.Set("org.mpris.MediaPlayer2.Player", "Mute", mute);
};


mediarenderer.MediaController.prototype.play = function() {
	return this.renderer.proxy.Play();
};


mediarenderer.MediaController.prototype.pause = function() {
	return this.renderer.proxy.Pause();
};


mediarenderer.MediaController.prototype.stop = function() {
	return this.renderer.proxy.Stop();
};


mediarenderer.MediaController.prototype.next = function() {
	return this.renderer.proxy.Next();
};


mediarenderer.MediaController.prototype.previous = function() {
	return this.renderer.proxy.Previous();
};


mediarenderer.MediaController.prototype.setVolume = function(vol) {
  var proxy = this.renderer.proxy;
  var promise = new cloudeebus.Promise(function (resolver) {
	var argStr = String(vol);
	if (argStr.indexOf(".") == -1)
		argStr += ".0";
	var arglist = [
	       		proxy.busConnection.name,
	       		proxy.busName,
	       		proxy.objectPath,
	       		"org.freedesktop.DBus.Properties",
	       		"Set",
	       		"[\"org.mpris.MediaPlayer2.Player\",\"Volume\"," + argStr + "]"
	       	];
	proxy.wampSession.call("dbusSend", arglist).then(
			function() {
				resolver.fulfill();
			},
			function() {
				resolver.reject();
			});
  });
  
  return promise;
};


mediarenderer.MediaController.prototype.setSpeed = function(speed) {
  var proxy = this.renderer.proxy;
  var promise = new cloudeebus.Promise(function (resolver) {
	var argStr = String(speed);
	if (argStr.indexOf(".") == -1)
		argStr += ".0";
	var arglist = [
	       		proxy.busConnection.name,
	       		proxy.busName,
	       		proxy.objectPath,
	       		"org.freedesktop.DBus.Properties",
	       		"Set",
	       		"[\"org.mpris.MediaPlayer2.Player\",\"Rate\"," + argStr + "]"
	       	];
	proxy.wampSession.call("dbusSend", arglist).then(
			function() {
				resolver.fulfill();
			},
			function() {
				resolver.reject();
			});
  });
  
  return promise;
};


mediarenderer.MediaController.prototype.gotoTrack = function(track) {
	return this.renderer.proxy.GotoTrack(Number(track));
};


mediarenderer.MediaController.prototype.seek = function(secOffset) {
	return this.renderer.proxy.Seek(Number(secOffset) * 1000000);
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
				var e = {type: "statuschanged"};
				if (changed.CurrentTrack != undefined)
					this.controller.track = e.track = changed.CurrentTrack;
				if (changed.Volume != undefined)
					this.controller.volume = e.volume = changed.Volume;
				if (changed.Mute != undefined)
					this.controller.muted = e.muted = changed.Mute;
				if (changed.PlaybackStatus != undefined) 
					this.controller.playbackStatus = e.playbackStatus = changed.PlaybackStatus.toLowerCase();
				if (changed.Rate != undefined) 
					this.controller.speed = e.speed = changed.Rate;
				if (this.controller.onstatuschanged)
					this.controller.onstatuschanged.call(this.controller, e);
			}, cloudeebus.log);
	}
	return this;
};


mediarenderer.MediaRenderer.prototype.openURI = function(mediaURI, metaData) {
	if (metaData)
		return this.proxy.OpenUriEx(mediaURI, metaData);
	return this.proxy.OpenUri(mediaURI);
};

mediarenderer.MediaRenderer.prototype.prefetchURI = function(mediaURI, metaData) {
	return this.proxy.OpenNextUri(mediaURI, metaData);
};
