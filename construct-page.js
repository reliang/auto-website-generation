window.onload = () => {
    var doc = document.implementation.createHTMLDocument();
    doc.body.append('Hello World!');
    var iframeDoc = document.querySelector('#iframe').contentDocument;
    iframeDoc.replaceChild(
        doc.documentElement,
        iframeDoc.documentElement
    );
}

document.getElementById("filepicker").addEventListener("change", function (event) {
    // input has to be <10 mb
    if (event.target.files[0].size > 10485760) {
        document.getElementById("upload-message").innerHTML = "File size too big (max 10mb)";
    } else {
        websiteModule.setFolder(event.target.files);
        document.getElementById("upload-message").innerHTML = "Folder uploaded!";
    }
});


var websiteModule = (function () {
    'use strict';

    const NUM_COL = 12;
    const NUM_ROW = 4;

    const IMG = 0;
    const P = 1;
    const H1 = 2;
    const LOGO = 3;
    const BUTTON = 4;
    const BG = 5;
    const H3 = 6;
    const GALLERY = 7;
    const GALLERY_CONTAINER = 8;

    const h1 = /^# (.*$)/gim; // captures title
    const p = /^(?!(!\[.*?\]\(.*?\))|[#\n])(.*$)/gm;// no lines starting with ![Any text](Any text), # any text, or \n
    const image = /!\[.*?\]\((.*?)\)/gim; // captures url

    var folderInput;
    var folders;
    var files;
    var filesChanged;
    var imgNumList;
    var inputList; // elements that need optimization
    var outputList;
    var elements; // elements that don't need optimization, includes logo & bg for landing
    var hasBG;
    var hasIMG;
    var bgCosts;
    var numRows;

    // customizable fields
    var landingH1Size = 2;
    var h1Size = 2;

    function _setFolder(input) {
        folderInput = input;
        filesChanged = true;
    }

    function _setH1Size(size) {
        h1Size = size;
    }

    function _setLandingH1Size(size) {
        landingH1Size = size;
    }

    function _generateWebsite() {

        // READ INPUT
        // read files into json
        if (!folderInput) {
            document.getElementById("upload-message").innerHTML = "No folder uploaded";
            return;
        } else if (!filesChanged) {
            allLoaded();
        } else {
            // initialize & reset variables
            imgNumList = [];
            inputList = [];
            elements = [];
            filesChanged = false;
            hasBG = false;
            hasIMG = false;
            // have to wait for everything to load
            let fileCount = 0;
            let validFiles = [];
            var filesLoaded = 0;
            // check files valid
            for (let i = 0; i < folderInput.length; i++) {
                let file = folderInput[i];
                if (file.type && (file.type.match('image.*') || file.type.match('text/plain'))) {
                    fileCount++;
                    validFiles[i] = true;
                }
            }

            for (let i = 0; i < folderInput.length; i++) {
                if (!validFiles[i]) {
                    //console.log("file ", i, " is invalid");
                    continue;
                }
                let file = folderInput[i];
                let item = {};
                item["src"] = file.webkitRelativePath;
                item["url"] = URL.createObjectURL(file);

                // Check if the file is an image.
                if (file.type && file.type.match('image.*')) {
                    //console.log(getFileNameNoExtension(item["src"]));
                    let filename = getFileNameNoExtension(item["src"]);
                    if (filename === "logo") {
                        item["type"] = LOGO;
                    } else if (filename === "background") {
                        item["type"] = BG;
                        hasBG = true;
                    } else if (filename.match("gallery")) {
                        let matches = filename.match(/\d+$/);
                        if (matches) {
                            let filenum = matches[0];
                            filenum = parseInt(filenum, 10);
                            item["type"] = GALLERY;
                            item["index"] = filenum - 1;
                        } else {
                            item["type"] = IMG;
                        }
                    } else {
                        let folder = getFolder(folderInput[i].webkitRelativePath);
                        let root = getRootFolder(folderInput[i].webkitRelativePath);
                        if (folder == root || parseInt(folder, 10) == 0) {
                            hasIMG = true;
                        }
                        item["type"] = IMG;
                    }
                    let img = new Image();
                    img.onload = function () {
                        item["width"] = this.width;
                        item["height"] = this.height;
                        // width / height, >1 means width > height
                        item["ratio"] = this.width / this.height;
                        if (imgNumList[i]) {
                            imgNumList[i]++;
                        } else {
                            imgNumList[i] = 1;
                        }

                        // process backgorund image through Edge Detection
                        if (item["type"] == BG) {
                            var filteredImg = Filters.filterImage(Filters.convolute, img,
                                [-1, -1, -1,
                                -1, 8, -1,
                                -1, -1, -1]
                            );
                            var c = document.createElement('canvas');
                            c.width = this.naturalWidth;
                            c.height = this.naturalHeight;
                            var ctx = c.getContext('2d');
                            ctx.putImageData(filteredImg, 0, 0);
                            //document.getElementById("test").append(c);
                            let width = this.naturalWidth;
                            let height = this.naturalHeight;
                            let margin = Math.floor(0.0833 * width);
                            //console.log(margin);
                            let xMax = NUM_COL;
                            let yMax = NUM_ROW;
                            let xIncr = (width - 2 * margin) / xMax;
                            let colWidth = (width - 2 * margin) / 12;
                            //console.log(colWidth);
                            let colSpanArr = [4, 6];
                            let yIncr = height / yMax;
                            let costs = [];
                            // Divide into sections and calculate avg RGB to approximate detail
                            for (let y = 0; y < yMax; y++) {
                                costs[y] = [];
                                for (let x = 0; x < xMax; x++) {
                                    let left = margin + x * xIncr;
                                    let top = y * yIncr;
                                    let imgData = ctx.getImageData(left, top, xIncr, yIncr);
                                    /*
                                    if (col == 8 && y == 0) {
                                        var c2 = document.createElement('canvas');
                                        c2.width = colWidth * colSpan;
                                        c2.height = yIncr;
                                        var ctx2 = c2.getContext('2d');
                                        ctx2.putImageData(imgData, 0, 0);
                                        document.getElementById("test").append(c2);
                                    }
                                    */
                                    let avgRGB = getAverageRGB(imgData);
                                    let avgVal = (avgRGB.r + avgRGB.g + avgRGB.b) / 3;
                                    //console.log(x + ' ,' + y );
                                    //console.log(avgRGB);
                                    //console.log(avgVal);
                                    costs[y][x] = avgVal;
                                }
                            }
                            //console.log(costs);
                            bgCosts = costs;
                        }
                        filesLoaded++;
                        if (fileCount == filesLoaded) {
                            allLoaded();
                        }
                    };
                    img.src = item["url"];
                } else if (file.type && file.type.match('text.*')) {
                    if (getFileName(item["src"]) === "h1.txt") {
                        item["type"] = H1;
                    } else if (getFileName(item["src"]) === "h3.txt") {
                        item["type"] = H3;
                    } else if (getFileName(item["src"]) === "button.txt") {
                        item["type"] = BUTTON;
                    } else {
                        item["type"] = P;
                    }
                    var fr = new FileReader();
                    //item["content"] = "hi";
                    fr.onload = (function (fr, item) {
                        return function () {
                            //console.log(fr.result);
                            item["content"] = fr.result;
                            filesLoaded++;
                            if (fileCount == filesLoaded) {
                                allLoaded();
                            }
                        }
                    })(fr, item);
                    fr.readAsText(file);
                }
                if (item["type"] === LOGO || item["type"] === BG) {
                    elements.push(item);
                } else {
                    // decide where to push item -> depends on the section the item is in
                    let folder = getFolder(folderInput[i].webkitRelativePath);
                    let root = getRootFolder(folderInput[i].webkitRelativePath);
                    if (folder != root) {
                        let folderNum = parseInt(folder, 10);
                        if (inputList[folderNum]) {
                            inputList[folderNum].push(item);
                        } else {
                            inputList[folderNum] = [item];
                        }
                    } else {
                        if (inputList[0]) {
                            inputList[0].push(item);
                        } else {
                            inputList[0] = [item];
                        }
                    }
                }

            }

        }
    }

    function _downloadWebsite() {
        var doc;
        if (outputList) {
            doc = generateHTML(false);
        }
        download(doc.documentElement.innerHTML, "output.html", "text/html");
    }

    // Function to download data to a file
    function download(data, filename, type) {
        var file = new Blob([data], {type: type});
        if (window.navigator.msSaveOrOpenBlob) // IE10+
            window.navigator.msSaveOrOpenBlob(file, filename);
        else { // Others
            var a = document.createElement("a"),
                    url = URL.createObjectURL(file);
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(function() {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);  
            }, 0); 
        }
    }

    // must wait for all files to be loaded before optimizing
    function allLoaded() {
        // OPTIMIZE
        outputList = [];
        let x;
        for (x in inputList) {
            let output;
            if (x == 0) {
                output = optimize(inputList[x], true);
            } else {
                output = optimize(inputList[x], false);
            }
            outputList.push(output);
        }
        
        var doc = generateHTML(true);
        
        var iframeDoc = document.querySelector('#iframe').contentDocument;
        iframeDoc.replaceChild(
            doc.documentElement,
            iframeDoc.documentElement
        );
    }

    function generateHTML(objUrl) {
        // DISPLAY
        // generate website from JSON object
        var doc = document.implementation.createHTMLDocument();
        // add meta tag to head
        var headID = doc.getElementsByTagName('head')[0];
        var meta = doc.createElement('meta');
        meta.name = "viewport";
        meta.content = "width=device-width, initial-scale=1";
        headID.appendChild(meta);
        // add bootstrap to head
        var link = doc.createElement('link');
        link.rel = 'stylesheet';
        link.href = "https://cdn.jsdelivr.net/npm/bootstrap@5.0.0-beta2/dist/css/bootstrap.min.css";
        link.integrity = "sha384-BmbxuPwQa2lc/FVzBcNJ7UAyJxM6wuqIj61tLrc4wSX0szH/Ev+nYRRuWlolflfl";
        link.crossOrigin = "anonymous";
        headID.appendChild(link);
        // create CSS classes
        var docStyle = document.createElement('style');
        docStyle.type = 'text/css';
        docStyle.innerHTML += '.vertical-center {margin: 0; position: absolute; top: 50%; -ms-transform: translateY(-50%); transform: translateY(-50%); width: 100%;}';
        docStyle.innerHTML += '.button {background-color: #000000; border: none; color: white; padding: 10px 25px; text-align: center; text-decoration: none; display: inline-block; margin: 4px 2px; cursor: pointer; border-radius: 25px;}';
        docStyle.innerHTML += 'body, html {height: 100%; margin: 0;}';
        docStyle.innerHTML += ".bg {height: 100%; background-position: center; background-repeat: no-repeat; background-size: cover;}";
        doc.getElementsByTagName('head')[0].appendChild(docStyle);
        let i;
        for (i in outputList) {
            let output = outputList[i];
            // create section 0: landing page
            if (i == 0) {
                // create document container w/ margins
                var container = doc.createElement('div');
                container.style.display = "grid";
                container.style.gridTemplateColumns = "8.33% auto 8.33%";
                let vh = document.getElementsByTagName("IFRAME")[0].offsetHeight;
                let navHeight = 70;
                let landingHeight = vh - navHeight;
                container.style.gridTemplateRows = navHeight + "px " + landingHeight + "px";
                container.style.position = "relative";
                doc.body.append(container);
                // add navbar
                let nav = doc.createElement('div');
                nav.style.gridColumn = "2";
                nav.style.gridRow = "1";
                nav.style.display = "grid";
                nav.style.gridTemplateColumns = "auto auto";
                nav.style.gridTemplateRows = "auto";
                container.append(nav);
                // add procedural elements to navbar
                let x;
                for (x in elements) {
                    let item = elements[x];
                    let docItem;
                    if (item.type == LOGO) {
                        docItem = new Image();
                        if (objUrl) {
                            docItem.src = item.url;
                        } else {
                            docItem.src = item.src;
                        }
                        docItem.style.paddingTop = "10px"
                        docItem.style.height = navHeight - 20 + "px";
                        docItem.style.gridRow = "1";
                        docItem.style.gridColumn = "1";
                        nav.append(docItem);
                    } else if (item.type == BG) {
                        container.classList += "bg";
                        let bgUrl;
                        if (objUrl) {
                            bgUrl = item.url;
                        } else {
                            bgUrl = item.src;
                        }
                        container.style.backgroundImage = "url(" + bgUrl + ")";
                    }
                }
                // create document grid
                var grid = doc.createElement('div');
                grid.style.gridColumn = "2 / 3";
                grid.style.gridRow = "2 / 3";
                grid.style.display = "grid";
                grid.style.gridTemplateColumns = "repeat(" + NUM_COL + ", " + 100 / NUM_COL + "%)";
                grid.style.alignItems = "center";
                if (hasBG && (!hasIMG)) {
                    grid.style.gridTemplateRows = "repeat(" + NUM_ROW + ", " + landingHeight / NUM_ROW + "px)";
                    grid.style.alignItems = "center";
                } else {
                    grid.style.gridAutoRows = "minmax(min-content, max-content)";
                }
                grid.className = "vertical-center";
                container.append(grid);
                // add items to grid
                for (x in output) {
                    let item = output[x];
                    let div = doc.createElement('div');
                    let row = item.style.row;
                    let col = item.style.col;
                    let colSpan = item.style["col-span"];
                    let rowSpan = item.style["row-span"];
                    div.style.gridRow = "" + (row + 1) + " / span " + rowSpan;
                    div.style.gridColumn = "" + (col + 1) + " / span " + colSpan;
                    grid.append(div);
                    if (item.type == IMG) {
                        div.style.alignSelf = "start";
                    }
                    let docItem = createDocItem(doc, item);
                    if (item.type == H1) {
                        docItem.style.fontSize = landingH1Size + "rem";
                    }
                    div.append(docItem);
                    if (item.children) {
                        let i;
                        for (i in item.children) {
                            let child = item.children[i];
                            div.append(createDocItem(doc, child));
                        }
                    }
                }
            } else { // create sections following the landing page
                // create document container w/ margins
                var container = doc.createElement('div');
                container.style.display = "grid";
                container.style.gridTemplateColumns = "8.33% auto 8.33%";
                container.style.gridTemplateRows = "auto";
                container.style.paddingTop = "60px";
                container.style.paddingBottom = "60px";
                container.style.position = "relative";
                doc.body.append(container);
                // create document grid
                var grid = doc.createElement('div');
                grid.style.gridColumn = "2 / 3";
                grid.style.gridRow = "1";
                grid.style.display = "grid";
                grid.style.gridTemplateColumns = "repeat(" + NUM_COL + ", " + 100 / NUM_COL + "%)";
                grid.style.gridAutoRows = "minmax(min-content, max-content)";
                container.append(grid);
                // add items to grid
                let x;
                for (x in output) {
                    let item = output[x];
                    let div = doc.createElement('div');
                    let row = item.style.row;
                    let col = item.style.col;
                    let colSpan = item.style["col-span"];
                    let rowSpan = item.style["row-span"];
                    div.style.gridRow = "" + (row + 1) + " / span " + rowSpan;
                    div.style.gridColumn = "" + (col + 1) + " / span " + colSpan;
                    if (item.type === GALLERY_CONTAINER) {
                        div.style.display = "grid";
                        div.style.gridTemplateColumns = "25% 25% 25% 25%";
                        grid.style.gridAutoRows = "minmax(min-content, max-content)";
                    }
                    grid.append(div);
                    let docItem = createDocItem(doc, item, objUrl);
                    if (item.type == H1) {
                        docItem.style.fontSize = h1Size + "rem";
                    }
                    if (docItem) {
                        div.append(docItem);
                    }
                    if (item.children) {
                        let i;
                        for (i in item.children) {
                            let child = item.children[i];
                            div.append(createDocItem(doc, child, objUrl));
                        }
                    }
                }
            }
        }
        return doc;
    }

    function createDocItem(doc, item, objUrl) {
        let docItem;
        if (item.type == IMG || item.type == GALLERY) {
            docItem = new Image();
            if (objUrl) {
                docItem.src = item.url;
            } else {
                docItem.src = item.src;
            }
            docItem.style.width = "100%";
            docItem.className = "px-2 pb-2";
        } else if (item.type == P) {
            docItem = doc.createElement('p');
            docItem.innerHTML = item.content;
            docItem.className = "px-4 pb-2";
        } else if (item.type == H1) {
            docItem = doc.createElement('h1');
            docItem.innerHTML = item.content;
            docItem.className = "px-4 pb-2";
        } else if (item.type == BUTTON) {
            docItem = doc.createElement('button');
            docItem.innerHTML = item.content;
            docItem.className = "mx-4 mb-2 button";
            docItem.style.alignSelf = "start";
            docItem.style.justifySelf = "start";
        } else if (item.type == H3) {
            docItem = doc.createElement('h4');
            docItem.innerHTML = item.content;
            docItem.className = "px-4 pb-2";
        }
        return docItem;
    }

    function getFileName(fullPath) {
        var startIndex = (fullPath.indexOf('\\') >= 0 ? fullPath.lastIndexOf('\\') : fullPath.lastIndexOf('/'));
        var filename = fullPath.substring(startIndex);
        if (filename.indexOf('\\') === 0 || filename.indexOf('/') === 0) {
            filename = filename.substring(1);
        }
        return filename;
    }

    function getRootFolder(fullPath) {
        var url = fullPath.split('/');
        return url[0];
    }

    function getFolder(fullPath) {
        var url = fullPath.split('/');
        if (url[url.length - 2]) {
            return url[url.length - 2];
        }
        return null;
    }

    function getFileNameNoExtension(fullPath) {
        var filename = getFileName(fullPath);
        var newFilename = filename.replace(/\.[^/.]+$/, "");
        return newFilename;
    }

    function optimize(input, landing) {
        // initialize items in grid
        var copyInput = JSON.parse(JSON.stringify(input));

        let newInput = [];
        let h1Idx = -1;
        let h3Idx = -1;
        let pIdx = -1;
        let buttonIdx = -1;
        let galleryChildren = [];
        let x;
        for (x in copyInput) {
            let item = copyInput[x];
            // randomize col size to be between 4-8, row & col
            var colSpan = 4 + Math.floor(Math.random() * 5);
            if (item.ratio < 0.75) {
                // between 3-4
                colSpan = 3 + Math.floor(Math.random() * 2);
            } else if (item.ratio < 1) {
                // between 3-6
                colSpan = 3 + Math.floor(Math.random() * 4);
            }
            var rowSpan = 1;
            if (landing && hasBG && (!hasIMG)) {
                rowSpan = 2;
            }
            var col = Math.floor(Math.random() * (NUM_COL - colSpan));
            var row = 0;
            item["style"] = {
                "row": row,
                "col": col,
                "col-span": colSpan,
                "row-span": rowSpan
            }
            if (item["type"] == GALLERY) {
                galleryChildren.push(item);
            } else if (item["type"] == H1) {
                h1Idx = x;
            } else if (item["type"] == H3) {
                h3Idx = x;
            } else if (item["type"] == BUTTON) {
                buttonIdx = x;
            } else if (item["type"] == P) {
                pIdx = x;
            } else {
                newInput.push(item);
            }
        }
        // process gallery
        if (galleryChildren.length > 0) {
            var colSpan = 12;
            var rowSpan = 1;
            var col = 0;
            var row = 0;
            let item = {}
            item["type"] = GALLERY_CONTAINER;
            item["children"] = galleryChildren;
            item["style"] = {
                "row": row,
                "col": col,
                "col-span": colSpan,
                "row-span": rowSpan
            }
            newInput.push(item);
        }
        // connect parent-child
        let groupParent;
        let rowOffsetMax = 1;
        let children = [];
        if (h1Idx != -1) {
            groupParent = h1Idx;
        }
        if (h3Idx != -1) {
            let item = copyInput[h3Idx];
            if (groupParent) {
                if (Math.random() < 0.5) {
                    let parent = copyInput[groupParent];
                    parent["parent"] = h3Idx;
                    parent["row-offset"] = rowOffsetMax;
                    rowOffsetMax++;
                    groupParent = h3Idx;
                    children.push(parent);
                } else {
                    item["parent"] = groupParent;
                    item["row-offset"] = rowOffsetMax;
                    rowOffsetMax++;
                    children.push(item);
                }
            } else {
                groupParent = h3Idx;
            }
        }
        if (pIdx != -1) {
            let item = copyInput[pIdx];
            if (groupParent) {
                item["parent"] = groupParent;
                item["row-offset"] = rowOffsetMax;
                rowOffsetMax++;
                children.push(item);
            } else {
                groupParent = pIdx;
            }
        }
        if (buttonIdx != -1) {
            let item = copyInput[buttonIdx];
            if (groupParent) {
                item["parent"] = groupParent;
                item["row-offset"] = rowOffsetMax;
                rowOffsetMax++;
                children.push(item);
            }
        }
        if (groupParent) {
            let parent = copyInput[groupParent];
            parent["children"] = children;
            newInput.push(parent);
        }
        console.log(newInput);
        return optimizeIter(newInput, landing);
    }

    function optimizeIter(input, landing) {

        /**
         * Rules
         * each row must have content
         * rows have mb
         * 
         * optimization moves
         * 1. set item to random col span between 4 to 8 (probability 0.2)
         * 2. set image row span between 1 to 3 (probability 0.2)
         * 3. change item row, with possibility to add row (probability 0.2)
         * 4. change item col (probability 0.2)
         * 
         * Post processing
         * Remove empty rows
         */

        var iter = 0;
        var lastInput = JSON.parse(JSON.stringify(input));
        var costs = costSummary(lastInput, landing);
        var cost = costs.overall;
        var currRowMax = 1;

        while ((cost >= 0.5 || iter < 30) && iter < 1000) {
            let nextInput = JSON.parse(JSON.stringify(lastInput));
            //var children = [];
            // optimization moves
            let x;
            for (x in nextInput) {
                let item = nextInput[x];
                let origRow = nextInput[x].style.row;
                let origCol = nextInput[x].style.col;
                let origColSpan = nextInput[x].style["col-span"];
                let origRowSpan = nextInput[x].style["row-span"];
                let row = origRow;
                let col = origCol;
                let colSpan = origColSpan;
                let rowSpan = origRowSpan;
                // if element has parent, keep idx (TODO: idx unchaging)
                if (hasParent(nextInput[x])) {
                    //children.push(x);
                    continue;
                } else {
                    // set item to random col span
                    if (item.type != GALLERY_CONTAINER) { 
                        if (Math.random() < 0.2) {
                            // between 4-8
                            colSpan = 4 + Math.floor(Math.random() * 5);
                            if (item.type == IMG) {
                                if (item.ratio < 0.75) {
                                    // between 3-4
                                    colSpan = 3 + Math.floor(Math.random() * 2);
                                } else if (item.ratio < 1.2) {
                                    // between 3-6
                                    colSpan = 3 + Math.floor(Math.random() * 4);
                                }
                            }
                            if (col + colSpan > NUM_COL) {
                                col = NUM_COL - colSpan;
                            }
                        }
                        // set image to random row span
                        /*
                        if (Math.random() < 0.2 && item.type == IMG) {
                            rowSpan = 1 + Math.floor(Math.random() * 3);
                            if (currRowMax < rowSpan + row) {
                                currRowMax = rowSpan + row;
                            }
                        } */
                        
                        // set item col
                        if (Math.random() < 0.2) {
                            col = Math.floor(Math.random() * (NUM_COL - colSpan));
                        }
                    }
                    
                    // set item row
                    if (Math.random() < 0.2) {
                        // if landing page without bg, now new rows
                        // if landing page, and has bg, generate within row limit
                        if (landing && hasBG && !(hasIMG)) {
                            row = Math.floor(Math.random() * (NUM_ROW - rowSpan + 1));
                        } else if (!landing) {
                            // if not landing page
                            // try to add item into an existing row
                            if (Math.random() < 0.9) {
                                row = Math.floor(Math.random() * currRowMax);
                                if (currRowMax < rowSpan + row) {
                                    currRowMax = rowSpan + row;
                                }
                            } else { // put item in new row
                                row = currRowMax;
                                currRowMax++;
                            }
                        }

                    }
                    
                    item["style"] = {
                        "row": row,
                        "col": col,
                        "col-span": colSpan,
                        "row-span": rowSpan
                    }
                }
            }
            /*
            for (x in children) {
                let itemIdx = children[x];
                let item = nextInput[itemIdx];
                let parentIdx = item.parent;
                let row = nextInput[parentIdx].style.row;
                let col = nextInput[parentIdx].style.col;
                let colSpan = nextInput[parentIdx].style["col-span"];
                let rowSpan = 1;
                item["style"] = {
                    "row": row,
                    "col": col,
                    "col-span": colSpan,
                    "row-span": rowSpan
                }
            }
            */
            let rowContent = [];
            // if has bg, no need to reduce empty rows
            if (landing && hasBG && !(hasIMG)) {
                numRows = NUM_ROW;
            } else {
                // another pass to order elements, then another to reduce empty rows
                let rowHasContent = new Array(currRowMax);
                let x;
                for (x in nextInput) {
                    let item = nextInput[x];
                    let row = item.style.row;
                    let rowSpan = item.style["row-span"];
                    let i;
                    for (i = 0; i < rowSpan; i++) {
                        rowHasContent[row + i] = true;
                    }
                    if (Array.isArray(rowContent[row])) {
                        rowContent[row].push(item);
                    } else {
                        rowContent[row] = [item];
                    }
                }
                let rowCount = 0;
                let lastRow = 0;
                for (x in rowHasContent) {
                    if (rowHasContent) {
                        let currRow = rowContent[x];
                        if (Array.isArray(currRow)) {
                            let y;
                            for (y in currRow) {
                                let item = currRow[y];
                                item.style.row = rowCount;

                            }
                        }
                        rowCount++;
                    }
                }
                numRows = rowCount;
                currRowMax = rowCount;
            }

            // calculate new cost, replace if new < current
            let newCosts = costSummary(nextInput, landing);
            let newCost = newCosts.overall;
            if (newCost < cost) {
                lastInput = nextInput;
                cost = newCost;
                costs = newCosts;
            }
            //console.log(lastInput);
            //console.log(cost);
            iter++;
        }
        console.log(iter);
        console.log(cost);
        console.log(lastInput);
        console.log(costs);
        return lastInput;
    }

    function shuffle(array) {
        var currentIndex = array.length, temporaryValue, randomIndex;

        // While there remain elements to shuffle...
        while (0 !== currentIndex) {

            // Pick a remaining element...
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;

            // And swap it with the current element.
            temporaryValue = array[currentIndex];
            array[currentIndex] = array[randomIndex];
            array[randomIndex] = temporaryValue;
        }

        return array;
    }

    function overallCost(input, landing) {
        let cost = 3 * clearanceCost(input) + 1 * distributionCost(input) + 4 * spaceUsageCost(input) + 2 * alignmentCost(input);
        if (landing && hasIMG && hasBG) {
            cost = 3 * clearanceCost(input) + 1 * distributionCost(input) + 2 * spaceUsageCost(input) + 2 * alignmentCost(input) + 0.25 * backgroundCost(input, landing);
        } else if (landing && hasBG) {
            cost = 3 * clearanceCost(input) + 1 * distributionCost(input) + 2 * alignmentCost(input) + 0.5 * backgroundCost(input, landing);
        } else if (!landing) {
            cost = 3 * clearanceCost(input) + 1 * distributionCost(input) + 4 * spaceUsageCost(input) + 2 * alignmentCost(input) + 0.5 * rowCost(input);
        }
        return cost;
    }

    function costSummary(input, landing) {
        let clearance = 3 * clearanceCost(input);
        let distribution = 1 * distributionCost(input);
        let spaceUsage = 4 * spaceUsageCost(input);
        let spaceUsage2 = 2 * spaceUsageCost(input);
        let alignment = 2 * alignmentCost(input);
        let background = 0.5 * backgroundCost(input, landing);
        let background2 = 0.25 * backgroundCost(input, landing);
        let row = 0.5 * rowCost(input);
        let overallCost = clearance + distribution + spaceUsage + alignment;
        if (landing && hasIMG && hasBG) {
            overallCost = clearance + distribution + spaceUsage2 + alignment + background2;
        } else if (landing && hasBG) {
            overallCost = clearance + distribution + alignment + background;
        } else if (!landing) {
            overallCost =  clearance + distribution + spaceUsage + alignment + row;
        }
        let cost = {
            "overall": overallCost,
            "clearance": clearance,
            "distribution": distribution,
            "space-usage": spaceUsage,
            "alignment": alignment
        }
        if (landing && hasIMG && hasBG) {
            cost = {
                "overall": overallCost,
                "clearance": clearance,
                "distribution": distribution,
                "space-usage": spaceUsage2,
                "alignment": alignment,
                "background": background2
            }
        } else if (landing && hasBG) {
            cost = {
                "overall": overallCost,
                "clearance": clearance,
                "distribution": distribution,
                "alignment": alignment,
                "background": background
            }
        } else if (!landing) {
            cost = {
                "overall": overallCost,
                "clearance": clearance,
                "distribution": distribution,
                "space-usage": spaceUsage,
                "alignment": alignment,
                "row": row
            }
        }
        return cost;
    }

    function rowCost(input) {
        // penalize for more rows, but discount if there are more elements
        return numRows * numRows / input.length; 
    }

    function spaceUsageCost(input) {
        let totalArea = NUM_COL * numRows;
        let freeArea = totalArea;
        let cost;
        for (let x = 0; x < input.length; x++) {
            let rowSpanX = input[x].style["row-span"];
            let colSpanX = input[x].style["col-span"];
            freeArea -= rowSpanX * colSpanX;
        }
        if (freeArea > 0) {
            cost = freeArea / totalArea;
        } else {
            cost = 0;
        }
        //console.log("space usage cost: " + cost);
        return cost;
    }


    // TODO: incorporate probability of title aligning with top of image etc.?
    function alignmentCost(input) {
        if (input.length < 2) {
            return 0;
        }
        let cost = 0;
        let numPairs = 0;
        for (let x = 0; x < input.length - 1; x++) {
            let y;
            for (y = x + 1; y < input.length; y++) {
                let colX = input[x].style.col;
                let colSpanX = input[x].style["col-span"];
                let endColX = colX + colSpanX;
                let colY = input[y].style.col;
                let colSpanY = input[y].style["col-span"];
                let endColY = colY + colSpanY - 1;
                let currCost = 0;
                let rowX = input[x].style.row;
                let rowSpanX = input[x].style["row-span"];
                let endRowX = rowX + rowSpanX - 1;
                let rowY = input[y].style.row;
                let rowSpanY = input[y].style["row-span"];
                let endRowY = rowY + rowSpanY - 1;
                /*
                if (isText(input[x].type) && isText(input[y].type)) {
                    if (colX != colY) {
                        currCost += 2;
                    }
                    if (endColX != endColY) {
                        currCost++;
                    }
                    cost += currCost / 3;
                    numPairs++;
                } 
                */
                if (rowX != rowY) {
                    currCost++;
                }
                cost += currCost;
                numPairs++;
            }
        }
        if (numPairs == 0) {
            return 0;
        }
        // average over number of pairs, (n*(n-1))/2
        cost /= numPairs;
        //console.log("alignment cost: " + cost);
        return cost;
    }

    function clearanceCost(input) {
        if (input.length < 2) {
            return 0;
        }
        let cost = 0;
        // compute overlap area over own area
        for (let x = 0; x < input.length - 1; x++) {
            let y;
            for (y = x + 1; y < input.length; y++) {
                let rowSpanX = input[x].style["row-span"];
                let colSpanX = input[x].style["col-span"];
                let rowSpanY = input[y].style["row-span"];
                let colSpanY = input[y].style["col-span"];
                let overlapArea = overlap(input, x, y);
                //cost += (overlapArea / (rowSpanX * colSpanX) + overlapArea / (rowSpanY * colSpanY)) / 2;
                cost += overlapArea;
            }
        }
        // average over number of pairs, (n*(n-1))/2
        cost *= 2 / (input.length * (input.length - 1));
        //console.log("clearance cost: " + cost);
        return cost;
    }

    function distributionCost(input) {
        if (input.length < 2) {
            return 0;
        }
        let dist = [];
        let distMax = 1e-6;
        let cost = 0;
        let sum = 0;
        // compute mean dist
        for (let x = 0; x < input.length - 1; x++) {
            let y;
            for (y = x + 1; y < input.length; y++) {
                let currDist = EdgeDist(input, x, y);
                sum += currDist;
                dist.push(currDist);
                distMax = Math.max(distMax, currDist);
            }
        }
        // get relative distance, then average over number of pairs = dist.length
        let mean = (sum / distMax) / dist.length;
        // compute variance
        for (let x = 0; x < dist.length; x++) {
            let stdDev = dist[x] / distMax - mean;
            cost += stdDev * stdDev;
        }
        //console.log("distribution cost: " + cost);
        return cost;
    }

    function backgroundCost(input, landing) {
        if (!landing || !hasBG) {
            return 0;
        }
        let cost = 0;
        for (let x = 0; x < input.length; x++) {
            let rowX = input[x].style.row;
            let rowSpanX = input[x].style["row-span"];
            let colX = input[x].style.col;
            let colSpanX = input[x].style["col-span"];
            let sum = 0;
            let count = 0;
            for (let i = rowX; i < rowX + rowSpanX; i++) {
                for (let j = colX; j < colX + colSpanX; j++) {
                    sum += bgCosts[i][j];
                    count++;
                }
            }
            cost += sum / count;
        }
        return cost;
    }

    // NO LONGER USED
    // test cost function, largest L1 = least cost
    function testCost(input) {
        if (input.length < 2) {
            return 0;
        }
        let cost = 0;
        for (let x = 0; x < input.length - 1; x++) {
            let y;
            for (y = x + 1; y < input.length; y++) {
                cost += 1 / L1(input, x, y);
            }
        }
        // average over number of pairs, (n*(n-1))/2
        cost *= 2 / (input.length * (input.length - 1));
        return cost;
    }

    // NO LONGER USED
    // title above text, and title close to text
    function textProximityCost(input) {
        if (input.length < 2) {
            return 0;
        }
        let cost = 0;
        let numPairs = 0;
        for (let x = 0; x < input.length - 1; x++) {
            let y;
            for (y = x + 1; y < input.length; y++) {
                let colX = input[x].style.col;
                let colSpanX = input[x].style["col-span"];
                let endColX = colX + colSpanX;
                let colY = input[y].style.col;
                let colSpanY = input[y].style["col-span"];
                let endColY = colY + colSpanY - 1;
                let currCost = 0;
                let rowX = input[x].style.row;
                let rowSpanX = input[x].style["row-span"];
                let endRowX = rowX + rowSpanX - 1;
                let rowY = input[y].style.row;
                let rowSpanY = input[y].style["row-span"];
                let endRowY = rowY + rowSpanY - 1;
                if (input[x].type == H1 && input[y].type == P) {
                    if (rowX > rowY - 1) {
                        currCost += rowX - (rowY - 1);
                    }
                    if (rowX < rowY - 1) {
                        currCost += 1 / 2 * ((rowY - 1) - rowX);
                    }
                    numPairs++;
                } else if (input[y].type == H1 && input[x].type == P) {
                    if (rowY > rowX - 1) {
                        currCost += rowY - (rowX - 1);
                    }
                    if (rowY < rowX - 1) {
                        currCost += 1 / 2 * ((rowX - 1) - rowY);
                    }
                    numPairs++;
                }
            }
        }
        if (numPairs == 0) {
            return 0;
        }
        // average over number of pairs, (n*(n-1))/2
        cost /= numPairs;
        return cost;
    }

    // NO LONGER USED
    function pageMarginCost(input) {
        let cost = 0;
        let numItems = 0;
        // all items
        for (let x = 0; x < input.length; x++) {
            let colX = input[x].style.col;
            let colSpanX = input[x].style["col-span"];
            let endColX = colX + colSpanX;
            let currCost = 0;
            if (colX == 0) {
                currCost++;
            }
            if (endColX == NUM_COL) {
                currCost++;
            }
            cost += currCost / 2;
            numItems++;
        }
        //console.log("page margin cost: " + cost);
        return cost;
    }

    // UTILITY FUNCTIONS

    function isText(type) {
        if (type == P || type == H1) {
            return true;
        } else {
            return false;
        }
    }

    function hasParent(item) {
        if (item.parent != null && item.parent != undefined) {
            return true;
        } else {
            return false;
        }
    }

    function overlap(input, x, y) {
        let rowX = input[x].style.row;
        let rowSpanX = input[x].style["row-span"];
        let endRowX = rowX + rowSpanX - 1;
        let colX = input[x].style.col;
        let colSpanX = input[x].style["col-span"];
        let endColX = colX + colSpanX - 1;
        let rowY = input[y].style.row;
        let rowSpanY = input[y].style["row-span"];
        let endRowY = rowY + rowSpanY - 1;
        let colY = input[y].style.col;
        let colSpanY = input[y].style["col-span"];
        let endColY = colY + colSpanY - 1;
        let horizOverlap;
        let vertOverlap
        // no vertical overlap
        if (endColX < colY) {
            return 0;
        } else if (endColY < colX) {
            return 0;
        } else {
            horizOverlap = Math.min(endColX, endColY) - Math.max(colX, colY) + 1;
        }
        // no horiz overlap
        if (endRowX < rowY) {
            return 0;
        } else if (endRowY < rowX) {
            return 0;
        } else {
            vertOverlap = Math.min(endRowX, endRowY) - Math.max(rowX, rowY) + 1;
        }
        let overlapArea = horizOverlap * vertOverlap;
        return overlapArea;
    }

    function L1(input, x, y) {
        let rowX = input[x].style.row;
        let rowSpanX = input[x].style["row-span"];
        let endRowX = rowX + rowSpanX - 1;
        let colX = input[x].style.col;
        let colSpanX = input[x].style["col-span"];
        let endColX = colX + colSpanX - 1;
        let rowY = input[y].style.row;
        let rowSpanY = input[y].style["row-span"];
        let endRowY = rowY + rowSpanY - 1;
        let colY = input[y].style.col;
        let colSpanY = input[y].style["col-span"];
        let endColY = colY + colSpanY - 1;
        let vertDist;
        let horizDist;
        // no vertical overlap
        if (endColX < colY) {
            horizDist = colY - endColX;
        } else if (endColY < colX) {
            horizDist = colX - endColY;
        } else {
            // between 0 and 1 depending on amount of overlap
            let overlap = Math.min(endColX, endColY) - Math.max(colX, colY) + 1;
            // average the overlap fraction of the two
            horizDist = ((1 - overlap / colSpanX) + (1 - overlap / colSpanY)) / 2;
        }
        // no horiz overlap
        if (endRowX < rowY) {
            vertDist = rowY - endRowX;
        } else if (endRowY < rowX) {
            vertDist = rowX - endRowY;
        } else {
            // between 0 and 1 depending on amount of overlap
            let overlap = Math.min(endRowX, endRowY) - Math.max(rowX, rowY) + 1;
            // average the overlap fraction of the two
            vertDist = ((1 - overlap / rowSpanX) + (1 - overlap / rowSpanY)) / 2;
        }
        return horizDist + vertDist;
    }

    function EdgeDist(input, x, y) {
        let rowX = input[x].style.row;
        let rowSpanX = input[x].style["row-span"];
        let endRowX = rowX + rowSpanX - 1;
        let colX = input[x].style.col;
        let colSpanX = input[x].style["col-span"];
        let endColX = colX + colSpanX - 1;
        let rowY = input[y].style.row;
        let rowSpanY = input[y].style["row-span"];
        let endRowY = rowY + rowSpanY - 1;
        let colY = input[y].style.col;
        let colSpanY = input[y].style["col-span"];
        let endColY = colY + colSpanY - 1;
        let vertDist;
        let horizDist;
        // no vertical overlap
        if (endColX < colY) {
            horizDist = colY - endColX;
        } else if (endColY < colX) {
            horizDist = colX - endColY;
        } else {
            horizDist = 0;
        }
        // no horiz overlap
        if (endRowX < rowY) {
            vertDist = rowY - endRowX;
        } else if (endRowY < rowX) {
            vertDist = rowX - endRowY;
        } else {
            vertDist = 0;
        }
        return Math.min(horizDist, vertDist);
    }

    function L2(input, x, y) {
        let rowX = input[x].style.row;
        let rowSpanX = input[x].style["row-span"];
        let endRowX = rowX + rowSpanX - 1;
        let colX = input[x].style.col;
        let colSpanX = input[x].style["col-span"];
        let endColX = colX + colSpanX - 1;
        let rowY = input[y].style.row;
        let rowSpanY = input[y].style["row-span"];
        let endRowY = rowY + rowSpanY - 1;
        let colY = input[y].style.col;
        let colSpanY = input[y].style["col-span"];
        let endColY = colY + colSpanY - 1;
        let vertDist;
        let horizDist;
        // no vertical overlap
        if (endColX < colY) {
            horizDist = colY - endColX;
        } else if (endColY < colX) {
            horizDist = colX - endColY;
        } else {
            // between 0 and 1 depending on amount of overlap
            let overlap = Math.min(endColX, endColY) - Math.max(colX, colY) + 1;
            // average the overlap fraction of the two
            horizDist = ((1 - overlap / colSpanX) + (1 - overlap / colSpanY)) / 2;
        }
        // no horiz overlap
        if (endRowX < rowY) {
            vertDist = rowY - endRowX;
        } else if (endRowY < rowX) {
            vertDist = rowX - endRowY;
        } else {
            // between 0 and 1 depending on amount of overlap
            let overlap = Math.min(endRowX, endRowY) - Math.max(rowX, rowY) + 1;
            // average the overlap fraction of the two
            vertDist = ((1 - overlap / rowSpanX) + (1 - overlap / rowSpanY)) / 2;
        }
        return Math.sqrt(horizDist * horizDist + vertDist * vertDist);
    }

    // Filter functions
    var Filters = {};
    Filters.getPixels = function (img) {
        var c = this.getCanvas(img.naturalWidth, img.naturalHeight);
        var ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, c.width, c.height);
    };

    Filters.getCanvas = function (w, h) {
        var c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        return c;
    };

    Filters.filterImage = function (filter, image, var_args) {
        var args = [this.getPixels(image)];
        for (var i = 2; i < arguments.length; i++) {
            args.push(arguments[i]);
        }
        return filter.apply(null, args);
    };

    Filters.tmpCanvas = document.createElement('canvas');
    Filters.tmpCtx = Filters.tmpCanvas.getContext('2d');

    Filters.createImageData = function (w, h) {
        return this.tmpCtx.createImageData(w, h);
    };

    Filters.convolute = function (pixels, weights, opaque) {
        var side = Math.round(Math.sqrt(weights.length));
        var halfSide = Math.floor(side / 2);
        var src = pixels.data;
        var sw = pixels.width;
        var sh = pixels.height;
        // pad output by the convolution matrix
        var w = sw;
        var h = sh;
        var output = Filters.createImageData(w, h);
        var dst = output.data;
        // go through the destination image pixels
        var alphaFac = opaque ? 1 : 0;
        for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++) {
                var sy = y;
                var sx = x;
                var dstOff = (y * w + x) * 4;
                // calculate the weighed sum of the source image pixels that
                // fall under the convolution matrix
                var r = 0, g = 0, b = 0, a = 0;
                for (var cy = 0; cy < side; cy++) {
                    for (var cx = 0; cx < side; cx++) {
                        var scy = sy + cy - halfSide;
                        var scx = sx + cx - halfSide;
                        if (scy >= 0 && scy < sh && scx >= 0 && scx < sw) {
                            var srcOff = (scy * sw + scx) * 4;
                            var wt = weights[cy * side + cx];
                            r += src[srcOff] * wt;
                            g += src[srcOff + 1] * wt;
                            b += src[srcOff + 2] * wt;
                            //a += src[srcOff+3] * wt;
                        }
                    }
                }
                dst[dstOff] = r;
                dst[dstOff + 1] = g;
                dst[dstOff + 2] = b;
                dst[dstOff + 3] = 255; //a + alphaFac*(255-a);
            }
        }
        return output;
    };

    // get average rgb value from pixel data
    function getAverageRGB(imgData) {

        var blockSize = 5, // only visit every 5 pixels
            data, width, height,
            i = -4,
            length,
            rgb = { r: 0, g: 0, b: 0 },
            count = 0;

        data = imgData;

        length = data.data.length;

        while ((i += blockSize * 4) < length) {
            ++count;
            if (data.data[i] > 100 || data.data[i + 1] > 100 || data.data[i + 2] > 100) {
                rgb.r += data.data[i];
                rgb.g += data.data[i + 1];
                rgb.b += data.data[i + 2];

            }
        }

        // ~~ used to floor values
        rgb.r = (rgb.r / count);
        rgb.g = (rgb.g / count);
        rgb.b = (rgb.b / count);

        return rgb;

    }

    const cropCanvas = (sourceCanvas, left, top, width, height) => {
        let destCanvas = document.createElement('canvas');
        destCanvas.width = width;
        destCanvas.height = height;
        destCanvas.getContext("2d").drawImage(
            sourceCanvas,
            left, top, width, height,  // source rect with content to crop
            0, 0, width, height);      // newCanvas, same size as source rect
        return destCanvas;
    }

    return {
        generateWebsite: function () {
            _generateWebsite();
        },
        downloadWebsite: function () {
            _downloadWebsite();
        },
        setFolder: function (input) {
            _setFolder(input);
        },
        setH1Size: function (size) {
            _setH1Size(size);
        },
        setLandingH1Size: function (size) {
            _setLandingH1Size(size);
        }
    };
})();