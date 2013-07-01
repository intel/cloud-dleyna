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

var mediacontent = window.mediacontent = {};



/*****************************************************************************/

mediacontent.MediaObject = function(proxy) {
	this.proxy = proxy;
	if (proxy) {
		this.id = proxy.Path;
		this.type = proxy.Type;
		this.title = proxy.DisplayName;
	}
	return this;
};


mediacontent.MediaObject.prototype.remove = function() {
	return this.proxy.callMethod("org.gnome.UPnP.MediaObject2", "Delete", []);
};


mediacontent.MediaObject.prototype.rename = function(newTitle) {
	return this.proxy.callMethod("org.gnome.UPnP.MediaObject2", "Update",
		[
		 {DisplayName:newTitle},
		 []
		]);
};


mediacontent.MediaObject.prototype.getMetaData = function() {
	return this.proxy.callMethod("org.gnome.UPnP.MediaObject2", "GetMetaData", []);
};



/*****************************************************************************/

mediacontent.MediaContainer = function(proxy) {
	mediacontent.MediaObject.call(this,proxy);
	this.type = "container";
	this.childCount = 0;
	this.canCreateContainer = false;
	this.canDelete = false;
	this.canUpload = false;
	this.canRename = false;
	return this;
};

mediacontent.MediaContainer.prototype = new mediacontent.MediaObject();
mediacontent.MediaContainer.prototype.constructor = mediacontent.MediaContainer;


mediacontent.MediaContainer.prototype.upload = function(title, path, successCallback, errorCallback) {
	this.proxy.callMethod("org.gnome.UPnP.MediaContainer2", "Upload",
		[
			title,
			path
		]).then(
		successCallback,
		errorCallback);
};


mediacontent.MediaContainer.prototype.createFolder = function(title, successCallback, errorCallback) {
	this.proxy.callMethod("org.gnome.UPnP.MediaContainer2", "CreateContainer",
		[
			title,
			"container",
			["*"],
		]).then(
		successCallback,
		errorCallback);
};



/*****************************************************************************/

mediacontent.MediaItem = function(proxy) {
	mediacontent.MediaObject.call(this,proxy);
	if (proxy) {
		this.type = proxy.MIMEType;
		if (proxy.URLs)
			this.content = { uri: proxy.URLs[0] };
		this.fileSize = proxy.Size;
		this.collection = proxy.Album;
		this.category = proxy.Genre;
		this.author = proxy.Artist;
		this.createdDate = proxy.Date;
	}
	return this;
};

mediacontent.MediaItem.prototype = new mediacontent.MediaObject();
mediacontent.MediaItem.prototype.constructor = mediacontent.MediaItem;



/*****************************************************************************/

mediacontent.MediaVideo = function(proxy) {
	mediacontent.MediaItem.call(this,proxy);
	if (proxy) {
		this.duration = proxy.Duration;
		this.resolution = {
			width: proxy.Width,
			height: proxy.Height
		};
	}
	return this;
};

mediacontent.MediaVideo.prototype = new mediacontent.MediaItem();
mediacontent.MediaVideo.prototype.constructor = mediacontent.MediaVideo;



/*****************************************************************************/

mediacontent.MediaAudio = function(proxy) {
	mediacontent.MediaItem.call(this,proxy);
	if (proxy) {
		this.samplingRate = proxy.SampleRate;
		this.duration = proxy.Duration;
	}
	return this;
};

mediacontent.MediaAudio.prototype = new mediacontent.MediaItem();
mediacontent.MediaAudio.prototype.constructor = mediacontent.MediaAudio;



/*****************************************************************************/

mediacontent.MediaImage = function(proxy) {
	mediacontent.MediaItem.call(this,proxy);
	if (proxy) {
		this.resolution = {
			width: proxy.Width,
			height: proxy.Height
		};
	}
	return this;
};

mediacontent.MediaImage.prototype = new mediacontent.MediaItem();
mediacontent.MediaImage.prototype.constructor = mediacontent.MediaImage;



/*****************************************************************************/

mediacontent.mediaObjectForProps = function(props) {
	if (props.Type.indexOf("container") == 0 ||
		props.Type.indexOf("album") == 0 ||
		props.Type.indexOf("person") == 0 ||
		props.Type.indexOf("genre") == 0)
		return new mediacontent.MediaContainer(props);
	if (props.Type.indexOf("video") == 0)
		return new mediacontent.MediaVideo(props);
	if (props.Type.indexOf("audio") == 0 ||
		props.Type.indexOf("music") == 0)
		return new mediacontent.MediaAudio(props);
	if (props.Type.indexOf("image") == 0)
		return new mediacontent.MediaImage(props);
	return new mediacontent.MediaItem(props);
};



