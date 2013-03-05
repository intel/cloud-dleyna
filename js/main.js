
	//
	// Global variables
	//
	
	// HTML DOM elements
	var mainView, localRenderingCheckBox, mediaRenderersListBox, mediaSourcesListBox, mediaSourceInfo, searchButton, searchField,
		uploadFile, uploadTitle, uploadButton, uploadTo, folderTitle,
		playButton, pauseButton, volButton, volField, nextButton, previousButton, trackButton, trackField,
		sortByPopList, sortDirectionPopList, folderPath, folderInfo, mediaContent, outLog;
	
	// DLNA global objects
	// Current media source
	var mediaSource;
	// Remote renderer (null if rendering locally)
	var remoteRenderer;
	// Browsing path from current DMS root folder
	var containerStack; 
	// Sort mode
	var sortMode;
	// Selected item
	var selectedItem;



	//
	// Browser-supported media types 
	//
	
	var knownMediaTypes = {
		audio: [	
			"audio/ogg",
			"audio/x-vorbis",
			"audio/x-vorbis+ogg",
			"audio/mpeg",
			"audio/mp4",
			"audio/l16",
			"audio/x-ac3", 
			"audio/x-wav",
			"audio/x-ms-wma"
		],
		video: [
			"video/ogg",
			"video/x-oggm",
			"video/x-dirac", 
			"video/x-theora",
			"video/x-theora+ogg",
			"video/x-3ivx",
			"video/mpeg",
			"video/mp4",
			"video/webm",
			"video/avi",
			"video/flv",
			"video/x-ms-wmv",
			"video/x-ms-asf",
			"video/x-msvideo"
	 ]
	};


	function getSupportedMediaTypes() {
		var supported = [];
		var media=["audio","video"];
		for (var i=0; i<media.length; i++) {
			var tag = document.createElement(media[i]);
			for (var j=0; j<knownMediaTypes[media[i]].length; j++) {
				if (tag.canPlayType(knownMediaTypes[media[i]][j])) // accept "probably", "maybe"
					supported.push(knownMediaTypes[media[i]][j]);
			}
		}
		return supported;
	}
	
	
	//
	// Browser local implementation of MediaRenderer getProtocolInfo API
	//
	
	function getProtocolInfo() {
		var info = "http-get:*:image/jpeg:*,http-get:*:image/png:*,http-get:*:image/gif:*";
		var mediaTypes = getSupportedMediaTypes();
		for (var i=0; i<mediaTypes.length; i++) {
			info += ",http-get:*:" + mediaTypes[i] + ":*";
		}
		return info;
	}



	//
	// Initialization on HTML page load
	//
	
	function initPage() {
		// init HTML DOM elements
		mainView = document.getElementById("mainView");
		localRenderingCheckBox = document.getElementById("localRenderingCheckBox");
		mediaRenderersListBox = document.getElementById("mediaRenderersListBox");
		mediaSourcesListBox = document.getElementById("mediaSourcesListBox");
		mediaSourceInfo = document.getElementById("mediaSourceInfo");
		searchButton = document.getElementById("searchButton");
		searchField = document.getElementById("searchField");
		uploadFile = document.getElementById("uploadFile");
		uploadTitle = document.getElementById("uploadTitle");
		uploadButton = document.getElementById("uploadButton");
		uploadTo = document.getElementById("uploadTo");
		folderTitle = document.getElementById("folderTitle");
		playButton = document.getElementById("playButton");
		pauseButton = document.getElementById("pauseButton");
		volButton = document.getElementById("volButton");
		volField = document.getElementById("volField");
		nextButton = document.getElementById("nextButton");
		previousButton = document.getElementById("previousButton");
		trackButton = document.getElementById("trackButton");
		trackField = document.getElementById("trackField");
		sortByPopList = document.getElementById("sortByPopList");
		sortDirectionPopList = document.getElementById("sortDirectionPopList");
		folderPath = document.getElementById("folderPath");
		folderInfo = document.getElementById("folderInfo");
		mediaContent = document.getElementById("mediaContent");
		// prevent page scrolling
		mainView.style.height = Math.floor(0.8 * window.innerHeight) + "px";
		// init browsing context
		setSortMode();
		// init DLNA global objects
		containerStack = [];
		// in default DMP mode, only require browser-supported media types
		mediaserver.setProtocolInfo(getProtocolInfo());
		// find DMS on the local network
		mediaserver.setServerListener({onserverfound:addMediaSource, onserverlost:removeMediaSourceById});
		// find DMR on the local network
		mediarenderer.setRendererListener({onrendererfound:addMediaRenderer, onrendererlost:removeMediaRendererById});
	}

	
	//
	// Dynamic HTML DOM elements creation
	//
	
	function containerBrowsingElement(source, container) {
		var node = document.createElement("input");
		node.type = "button";
		node.value = container.title;
		node.mediaSource = source;
		node.mediaContainer = container;
		return node;
	}
	
	function containerBrowsingListItem(source, container) {
		var node = containerBrowsingElement(source, container);
		node.className="listContent";
		return node;
	}

	
	function mediaItemElement(item) {
		var node = document.createElement("div");
		node.className="content listContent";
		node.innerHTML = item.title;
		return node;
	}
	
	
	//
	// Media renderers management
	//

    function getMediaRendererById(id) {
		for (var i=0; i<mediaRenderersListBox.options.length; i++) {
			if (mediaRenderersListBox.options[i].value == id)
				return mediaRenderersListBox.options[i].mediaRenderer;
		}
    }

	function addMediaRenderer(renderer) {
		// Catch bogus media renderer / detected but introspection failed
		if (renderer.friendlyName == undefined)
			return;
		// check if the media renderer is already known
		if (getMediaRendererById(renderer.id))
			return;
		// add an option to the listbox
		var node = document.createElement("option");
		node.text = renderer.friendlyName;
		node.value = renderer.id;
		node.mediaRenderer = renderer;
		mediaRenderersListBox.add(node);
	}
	
	function removeMediaRendererById(rendererId) {
		// seek media renderer in the listbox
		for (var i=0; i<mediaRenderersListBox.options.length; i++) {
			if (mediaRenderersListBox.options[i].value == rendererId) {
				// remove media renderer from the listbox
				mediaRenderersListBox.remove(i);
				return;
			}
		}
	}

	function setRemoteRenderer(renderer) {
		if (remoteRenderer)
			remoteRenderer.controller.stop();
		remoteRenderer = renderer;
		if (remoteRenderer) {
			playButton.disabled = pauseButton.disabled = volButton.disabled = volField.disabled = nextButton.disabled = previousButton.disabled = trackButton.disabled = trackField.disabled = false;
			volField.value = remoteRenderer.controller.volume;
			trackField.value = remoteRenderer.controller.track;
			mediaserver.setProtocolInfo(remoteRenderer.protocolInfo);
		}
		else {
			playButton.disabled = pauseButton.disabled = volButton.disabled = volField.disabled = nextButton.disabled = previousButton.disabled = trackButton.disabled = trackField.disabled = true;
			mediaserver.setProtocolInfo(getProtocolInfo());
		}
		clearFolderInfo();
	}
	
	function mediaRenderersListBoxChanged() {
		if (mediaRenderersListBox.selectedIndex==-1) {
			localRenderingCheckBox.checked = "checked";
			setRemoteRenderer(null);
		}
		else {
			localRenderingCheckBox.checked = false;
			setRemoteRenderer(mediaRenderersListBox.options[mediaRenderersListBox.selectedIndex].mediaRenderer);
		}
	}
	
	function localRenderingCheckBoxChanged() {
		if (localRenderingCheckBox.checked) {
			mediaRenderersListBox.selectedIndex = -1;
			setRemoteRenderer(null);
		}
		else
			mediaRenderersListBoxChanged();
	}
	
	function nextTrack() {
		remoteRenderer.controller.next();
		trackField.value = remoteRenderer.controller.track;
	}
	
	function previousTrack() {
		remoteRenderer.controller.previous();
		trackField.value = remoteRenderer.controller.track;
	}

	
	//
	// Media sources management
	//

    function getMediaSourceById(id) {
		for (var i=0; i<mediaSourcesListBox.options.length; i++) {
			if (mediaSourcesListBox.options[i].value == id)
				return mediaSourcesListBox.options[i].mediaSource;
		}
    }

	function addMediaSource(source) {
		// Catch bogus media source / detected but introspection failed
		if (source.friendlyName == undefined)
			return;
		// check if the media source is already known
		if (getMediaSourceById(source.id))
			return;
		// add an option to the listbox
		var node = document.createElement("option");
		node.text = source.friendlyName;
		node.value = source.id;
		node.mediaSource = source;
		mediaSourcesListBox.add(node);
	}
	
	function removeMediaSourceById(sourceId) {
		// seek media source in the listbox
		for (var i=0; i<mediaSourcesListBox.options.length; i++) {
			if (mediaSourcesListBox.options[i].value == sourceId) {
				// clear browsing area if the current media source is removed
				if (i == mediaSourcesListBox.selectedIndex)
					clearMediaSourceBrowsing();
				// remove media source from the listbox
				mediaSourcesListBox.remove(i);
				return;
			}
		}
	}

	
	//
	// Selected media source info
	//

	function logMediaSourceInfo(source) {
		mediaSourceInfo.innerHTML = "";
		if (source.iconURL)
			mediaSourceInfo.innerHTML += "<img width=32 height=32 src='" + source.iconURL + "' alt='" + source.friendlyName + "'>";
		mediaSourceInfo.innerHTML += "<b>" + source.friendlyName + "<b><br>";
		mediaSourceInfo.innerHTML += source.UPC + "<br>";
		if (source.serialNumber)
			mediaSourceInfo.innerHTML += "s/n: " + source.serialNumber + "<br>";
		if (source.manufacturerURL)
			mediaSourceInfo.innerHTML += "Manufacturer: " + "<a href='" + source.manufacturerURL + "'>" + source.manufacturerURL + "</a><br>";
		if (source.modelName)
			mediaSourceInfo.innerHTML += "Model: " + source.modelName + " (" + source.modelNumber + ")<br>"; 
		if (source.modelURL)
			mediaSourceInfo.innerHTML += "<a href='" + source.modelURL + "'>" + source.modelURL + "</a><br>";
		if (source.modelDescription)
			mediaSourceInfo.innerHTML += "Description: " + source.modelDescription + "<br>";
		if (source.presentationURL)
			mediaSourceInfo.innerHTML += "<a href='" + source.presentationURL + "'>" + source.presentationURL + "</a><br>";
		clearFolderBrowsing();
		if (source.root)
			browseMediaSourceContainer(source, source.root);
		mediaSource = source;
	}

	
	//
	// Media content view
	//

	function fitItemNodeInClientView(item, node, view) {
		// align largest item dimension on view, keep proportions 
		var ratio,xratio,yratio;
		xratio = view.clientWidth / item.resolution.width;
		yratio = view.clientHeight / item.resolution.height;
		ratio = xratio < yratio ? xratio : yratio;
		node.width = item.resolution.width * ratio;
		node.height = item.resolution.height * ratio;
		return node;
	}
	
	function containerContentsItemOnClick() {
		clearContentArea();
		if (this.mediaContainer) {
			browseMediaSourceContainer(this.mediaSource, this.mediaContainer);
			return;
		}
		this.className = "content selectedContent listContent";
		selectedItem = this;
		if (remoteRenderer) {
			var renderer = remoteRenderer;
			remoteRenderer.openURI(this.mediaItem.content.uri,
					function(){renderer.controller.play();},
					debugLog);
			return;
		}
		var node = null;
		if (this.mediaItem.type.indexOf("image") == 0) {
			node = document.createElement("img");
			node.src = this.mediaItem.content.uri;
			fitItemNodeInClientView(this.mediaItem, node, mediaContent);
		}
		else {
			if (this.mediaItem.type.indexOf("video") == 0) {
				node = document.createElement("video");
				fitItemNodeInClientView(this.mediaItem, node, mediaContent);
			}
			else if (this.mediaItem.type.indexOf("audio") == 0) {
				node = document.createElement("audio");
			}
			else 
				return;
			var source = document.createElement("source");
			source.src = this.mediaItem.content.uri;
			source.type = this.mediaItem.type;
			node.controls = true;
			node.autoplay = true;
			node.appendChild(source);
		}
		node.className = "content";
		mediaContent.appendChild(node);
	}
	
	
	//
	// Current browsing path management
	//

	function folderPathButtonOnClick() {
		browseContainerInStack(this.mediaSource, this.mediaContainer.id);
	}
	
	function pushContainerToFolderPath(source, container) {
		var node = containerBrowsingElement(source, container);
		node.onclick = folderPathButtonOnClick;
		folderPath.appendChild(node);		
	}
	
	function browseContainerInStack(source, containerId) {
		var i;
		var container = null;
		// clear all containers below the selected one
		for (i=0; i<containerStack.length; i++) {
			if (containerStack[i].id == containerId) {
				container = containerStack[i];
				containerStack.splice(i,containerStack.length-i);
			}
		}
		if (!container)
			return;
		folderPath.innerHTML="<hr>";
		for (i=0; i<containerStack.length; i++) {
			pushContainerToFolderPath(source, containerStack[i]);
		}
		browseMediaSourceContainer(source, container);
	}



	//
	// Delete content
	//
    
	
	function removedItemOk() {
		alert("Removed item");
	}


	function removeCurrentContent() {
		var msg, obj;
		if (selectedItem) {
			obj = selectedItem.mediaItem;
			msg = "Remove " + obj.type + " item \"" + obj.title + "\" ?";
		}
		else if (containerStack.length) {
			obj = containerStack[containerStack.length-1];
			msg = "Remove folder \"" + obj.title + "\" and all it's content ?"; 
		}
		else
			return;
		if (!confirm(msg))
			return;
		obj.remove(removedItemOk, debugLog);
	}


	
	//
	// Create folder
	//

	
	function createFolderOk() {
		alert("Folder created");
	}


	function createFolder(title) {
		if (document.getElementById("createUnderAny").checked) {
			mediaSource.createFolder(title, createFolderOk, debugLog);
			return;
		}
		if (containerStack.length == 0)
			return;
		var parent = containerStack[containerStack.length-1];
		parent.createFolder(title, createFolderOk, debugLog);
	}


	
	//
	// Uploads to a DMS
	//
    
	
	function uploadedItemOk() {
		alert("Uploaded item");
	}


	function uploadLocalContent() {
		if (uploadTo.selectedIndex == 0)
			uploadButton.source.upload(uploadTitle.value, uploadFile.value, uploadedItemOk, debugLog);
		else
			uploadButton.container.upload(uploadTitle.value, uploadFile.value, uploadedItemOk, debugLog);
	}

	
	
	//
	// Media source find under given container
	//

    
	function findInMediaSourceContainer(source, container, query) {
		var findCount = 10;
		var findOffset = 0;
		
		function findErrorCB(str) {
			alert("Error searching for " + query + " in " + container.title + " : " + str);
		}
		
	    function findContainerCB(mediaObjectArray) 
	    {
			// exit if we started browsing another container
			if (container.id != containerStack[containerStack.length-1].id
				// or if we launched another search
					|| container.id != searchButton.container.id
					|| source.id != searchButton.source.id
					|| query != searchField.value)
				return;
			for (var i=0; i<mediaObjectArray.length; i++) {
				var node = null;
				if (mediaObjectArray[i].type == "container") {
					node = containerBrowsingListItem(source, mediaObjectArray[i]);
				}
				else {
					node = mediaItemElement(mediaObjectArray[i]);
				}
				node.mediaItem = mediaObjectArray[i];
				node.onclick = containerContentsItemOnClick;
				outLog.appendChild(node);
			}
			if (mediaObjectArray.length == findCount) {
				findOffset += findCount;
				source.find(container.id, 
						findContainerCB, 
						findErrorCB,  /* errorCallback */
						query, /* search query */
						sortMode,  /* sortMode */
						findCount, 
						findOffset);
			}
	    }
		
		clearFolderInfo();
		source.find(container.id, 
				findContainerCB, 
				findErrorCB, /* errorCallback */
				query, /* search query */
				sortMode, /* sortMode */
				findCount, 
				findOffset);
	}


	//
	// Media source browsing by folder management
	//

    
	function browseMediaSourceContainer(source, container) {
		var browseCount = 10;
		var browseOffset = 0;
		
		function browseErrorCB(str) {
			alert("Error browsing " + container.title + " : " + str);
		}
		
	    function browseContainerCB(mediaObjectArray) 
	    {
			// exit if we are not browsing the current container
			if (container.id != containerStack[containerStack.length-1].id)
				return;
			for (var i=0; i<mediaObjectArray.length; i++) {
				var node = null;
				if (mediaObjectArray[i].type == "container") {
					node = containerBrowsingListItem(source, mediaObjectArray[i]);
				}
				else {
					node = mediaItemElement(mediaObjectArray[i]);
				}
				node.mediaItem = mediaObjectArray[i];
				node.onclick = containerContentsItemOnClick;
				outLog.appendChild(node);
			}
			if (mediaObjectArray.length == browseCount) {
				browseOffset += browseCount;
				source.browse(container.id, 
						browseContainerCB, 
						browseErrorCB,  /* errorCallback */
						sortMode,  /* sortMode */
						browseCount, 
						browseOffset);
			}
	    }
		
		searchButton.source = uploadButton.source = source;
		searchButton.container = uploadButton.container = container;
		containerStack.push(container);
		pushContainerToFolderPath(source, container);
		clearFolderInfo();
		source.browse(container.id, 
				browseContainerCB, 
				browseErrorCB, /* errorCallback */
				sortMode, /* sortMode */
				browseCount, 
				browseOffset);
	}


	//
	// Content browsing sort mode
	//

	function setSortMode() {
		sortMode = {
				attributeName: sortByPopList.options[sortByPopList.selectedIndex].value,
				order: sortDirectionPopList.options[sortDirectionPopList.selectedIndex].value
		};
	}


	//
	// Clear content browsing areas
	//

	function clearContentArea() {
		mediaContent.innerHTML="";
		if (selectedItem)
			selectedItem.className = "content listContent";
		selectedItem=null;
	}
	    
	function clearFolderInfo() {
		outLog = document.createElement("div");
		outLog.style.width = (folderInfo.clientWidth - 4) + "px";
		outLog.style.maxWidth = folderInfo.clientWidth + "px";
		outLog.style.maxHeight = folderInfo.clientHeight + "px";
		outLog.style.overflow = "auto";
		folderInfo.innerHTML="<hr>";
		folderInfo.appendChild(outLog);
		clearContentArea();
	}

	    
	function clearFolderBrowsing() {
		containerStack = [];
		folderPath.innerHTML="<hr>";
		clearFolderInfo();
	}
	
	function clearMediaSourceBrowsing() {
		mediaSourceInfo.innerHTML="";
		clearFolderBrowsing();
	}
	
	//
	// Debug log function
	//

	function debugLog(msg) {
		alert(msg);
	}
	
	//
	// Cloudeebus manifest
	//

	var manifest = {
			name: "cloud-dLeyna",
			version: "development",
			key: "dLeyna",
			permissions: [
				"com.intel.media-service-upnp",
				"com.intel.renderer-service-upnp"
			]
	};
	
	//
	// Main Init function
	//

	function initRenderers() {
		mediarenderer.reset();
		mediarenderer.bus = mediaserver.bus;
		mediarenderer.uri = mediaserver.uri;
		mediarenderer.manager = mediarenderer.bus.getObject(
				mediarenderer.busName, 
				"/com/intel/RendererServiceUPnP", 
				initPage);
	}
	
	var init = function () {
		var cloudeebusURI = "ws://localhost:9000";
		mediaserver.init(cloudeebusURI, 
				manifest,
				initRenderers,
				debugLog);
	};
	
	// window.onload can work without <body onload="">
	window.onload = init;
