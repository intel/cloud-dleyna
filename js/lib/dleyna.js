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
	};
	
	cloudeebus.connect(uri, onConnectOk, errorCB);
};


dleyna.getServers = function(successCB, errorCB) {
	
	var objs = [];
	var objIds = null;
	
	function onServerOk(obj) {
		objs.push(new dleyna.MediaServer(obj));
		if (successCB && objIds && objIds.length == objs.length)
			successCB(objs);		
	}
	
	function onObjIdsOk(ids) {
		objIds = ids;
		for (var i=0; i<ids.length; i++)
			dleyna.bus.getObject(dleyna.busName, ids[i], onServerOk, errorCB);
	};
	
	dleyna.manager.getServers(onObjIdsOk, errorCB);
};


dleyna.setServerListener = function(serverCallback, errorCallback) {
};



/*****************************************************************************/


dleyna.MediaServer = function(proxy) {
	return this;
};




