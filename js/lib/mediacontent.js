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



/*****************************************************************************/

mediacontent.MediaContainer = function(proxy) {
	mediacontent.MediaObject.call(this,proxy);
	this.type = "container";
	return this;
};

mediacontent.MediaContainer.prototype = new mediacontent.MediaObject();
mediacontent.MediaContainer.prototype.constructor = mediacontent.MediaContainer;



/*****************************************************************************/

mediacontent.MediaItem = function(proxy) {
	mediacontent.MediaObject.call(this,proxy);
	if (proxy) {
		this.type = proxy.MIMEType;
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
		this.width = proxy.Width;
		this.height = proxy.Height;
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
		this.width = proxy.Width;
		this.height = proxy.Height;
	}
	return this;
};

mediacontent.MediaImage.prototype = new mediacontent.MediaItem();
mediacontent.MediaImage.prototype.constructor = mediacontent.MediaImage;



/*****************************************************************************/

mediacontent.mediaObjectForProxy = function(proxy) {
	if (proxy.Type.indexOf("container") == 0 ||
		proxy.Type.indexOf("album") == 0 ||
		proxy.Type.indexOf("person") == 0 ||
		proxy.Type.indexOf("genre") == 0)
		return new mediacontent.MediaContainer(proxy);
	if (proxy.Type.indexOf("video") == 0)
		return new mediacontent.MediaVideo(proxy);
	if (proxy.Type.indexOf("audio") == 0 ||
		proxy.Type.indexOf("music") == 0)
		return new mediacontent.MediaAudio(proxy);
	if (proxy.Type.indexOf("image") == 0)
		return new mediacontent.MediaImage(proxy);
	return new mediacontent.MediaItem(proxy);
};



