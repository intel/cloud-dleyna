
	//
	// Global variables
	//
	
	// HTML DOM elements
	var mainView, mediaSourcesListBox, mediaSourceInfo, sortByPopList, sortDirectionPopList, folderPath, folderInfo, mediaContent, outLog;
	
	// DLNA global objects
	// Browsing path from current DMS root folder
	var containerStack; 
	// Sort mode
	var sortMode;
	
	//
	// Initialization on HTML page load
	//
	
	function initPage() {
		// init HTML DOM elements
		mainView = document.getElementById("mainView");
		mediaSourcesListBox = document.getElementById("mediaSourcesListBox");
		mediaSourceInfo = document.getElementById("mediaSourceInfo");
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
		mediaSources = [];
		containerStack = [];
		// find DMS on the local network
		dleyna.setServerListener({onserverfound:addMediaSource, onserverlost:removeMediaSourceById},debugLog);
	}

	
	//
	// Dynamic HTML DOM elements creation
	//
	
	function containerBrowsingElement(source, container) {
		var node = document.createElement("input");
		node.type = "button";
		node.value = container.displayName;
		node.mediaSource = source;
		node.mediaContainer = container;
		return node;
	}
	
	function mediaItemElement(item) {
		var node = document.createElement("div");
		node.style.borderStyle = "solid";
		node.style.borderWidth = "1px";
		node.style.backgroundColor = "#F7E9E9";
		node.innerHTML = item.displayName;
		return node;
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
		mediaSourceInfo.innerHTML = "<b>" + source.friendlyName + "<b><br>";
		mediaSourceInfo.innerHTML += source.id + "<br>";
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
		if (source.UPC)
			mediaSourceInfo.innerHTML += "UPC: " + source.UPC + "<br>";
		if (source.presentationURL)
			mediaSourceInfo.innerHTML += "<a href='" + source.presentationURL + "'>" + source.presentationURL + "</a><br>";
		clearFolderBrowsing();
		if (source.root)
			browseMediaSourceContainer(source, source.root);
	}

	
	//
	// Media content view
	//

	function fitItemNodeInClientView(item, node, view) {
		// align largest item dimension on view, keep proportions 
		var ratio;
		if (item.width > item.height)
			ratio = view.clientWidth / item.width;
		else
			ratio = view.clientHeight / item.height;
		node.width = item.width * ratio;
		node.height = item.height * ratio;
		return node;
	}
	
	function containerContentsItemOnClick() {
		clearContentArea();
		if (this.mediaContainer) {
			browseMediaSourceContainer(this.mediaSource, this.mediaContainer);
			return;
		}
		var node = null;
		if (this.mediaItem.type == "image") {
			node = document.createElement("img");
			node.src = this.mediaItem.URLs[0];
			fitItemNodeInClientView(this.mediaItem, node, mediaContent);
		}
		else {
			if (this.mediaItem.type == "video") {
				node = document.createElement("video");
				fitItemNodeInClientView(this.mediaItem, node, mediaContent);
			}
			else if (this.mediaItem.type == "audio") {
				node = document.createElement("audio");
			}
			else 
				return;
			var source = document.createElement("source");
			source.src = this.mediaItem.URLs[0];
			source.type = this.mediaItem.mimeType;
			node.controls = true;
			node.autoplay = true;
			node.appendChild(source);
		}
		node.style.borderStyle = "solid";
		node.style.borderWidth = "1px";
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
	// Media source browsing by folder management
	//

    
	function browseMediaSourceContainer(source, container) {
		var browseCount = 10;
		var browseOffset = 0;
		
		function browseErrorCB(str) {
			alert(str);
		}
		
	    function browseContainerCB(mediaObjectArray) 
	    {
			// exit if we are not browsing the current container
			if (container.id != containerStack[containerStack.length-1].id)
				return;
			for (var i=0; i<mediaObjectArray.length; i++) {
				var node = null;
				if (mediaObjectArray[i].type == "container") {
					node = containerBrowsingElement(source, mediaObjectArray[i]);
				}
				else {
					node = mediaItemElement(mediaObjectArray[i]);
				}
				node.mediaItem = mediaObjectArray[i];
				node.onclick = containerContentsItemOnClick;
				node.style.width = "100%";
				outLog.appendChild(node);
				outLog.appendChild(document.createElement("br"));
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
	}
	    
	function clearFolderInfo() {
		outLog = document.createElement("div");
		outLog.style.width = folderInfo.clientWidth + "px";
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
			name: "tizen-dlna-app",
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

	var init = function () {
		var cloudeebusURI = "ws://localhost:9000";
		dleyna.init(cloudeebusURI, 
				manifest,
				initPage,
				debugLog);
	};
	
	// window.onload can work without <body onload="">
	window.onload = init;
