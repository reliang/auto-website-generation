window.onload = () => {
    var doc = document.implementation.createHTMLDocument();
    doc.body.append('Hello World!');
    var iframeDoc = document.querySelector('iframe').contentDocument;
    iframeDoc.replaceChild(
        doc.documentElement,
        iframeDoc.documentElement
    );
}

/**
 * TODO
 * Make const for max rol num and col num
 * Make const for each probability
 * Write code to test convergence
 */

const IMG = 0;
const P = 1;
const H1 = 2;

const h1 = /^# (.*$)/gim; // captures title
const p = /^(?!(!\[.*?\]\(.*?\))|[#\n])(.*$)/gm;// no lines starting with ![Any text](Any text), # any text, or \n
const image = /!\[.*?\]\((.*?)\)/gim; // captures url

var files;
var input;

function generateWebsite() {
    // init json
    input = [];

    // have to wait for everything to load
    let fileCount = 0;
    let validFiles = [];
    var filesLoaded = 0;

    // READ INPUT
    // read files into json
    if (!files) {
        document.getElementById("upload-message").innerHTML = "No folder uploaded";
        return;
    } else {
        // check files valid
        for (let i = 0; i < files.length; i++) {
            let file = files[i];
            if (file.type && (file.type.match('image.*') || file.type.match('text/plain'))) {
                fileCount++;
                validFiles[i] = true;
            }
            // test
            /*
            if (getFileName(file.webkitRelativePath) === "content.txt") {
            }
            */
        }
        
        for (let i = 0; i < files.length; i++) {
            if (!validFiles[i]) {
                //console.log("file ", i, " is invalid");
                continue;
            }
            let file = files[i];
            let item = {};
            item["src"] = file.webkitRelativePath;
            item["url"] = URL.createObjectURL(file);
            
            // Check if the file is an image.
            if (file.type && file.type.match('image.*')) {
                item["type"] = IMG;
                let img = new Image();
                img.onload = function () {
                    item["width"] = this.width;
                    item["height"] = this.height;
                    // width / height, >1 means width > height
                    item["ratio"] = this.width / this.height;
                    filesLoaded++;
                    if (fileCount == filesLoaded) {
                        allLoaded();
                    }
                };
                img.src = item["url"];
            } else if (file.type && file.type.match('text.*')) {
                if (getFileName(item["src"]) === "h1.txt") {
                    item["type"] = H1;
                } else {
                    item["type"] = P;
                }
                var fr = new FileReader();
                //item["content"] = "hi";
                fr.onload = (function(fr, item) {
                    return function() {
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
            input.push(item);
        }
    }
}

// must wait for all files to be loaded before optimizing
function allLoaded(){
    // OPTIMIZE
    var output = optimize(input);

    // DISPLAY
    // generate website from JSON object
    var doc = document.implementation.createHTMLDocument();
    // add bootstrap to head
    var headID = doc.getElementsByTagName('head')[0];
    var link = doc.createElement('link');
    link.rel = 'stylesheet';
    link.href = "https://cdn.jsdelivr.net/npm/bootstrap@5.0.0-beta2/dist/css/bootstrap.min.css";
    link.integrity = "sha384-BmbxuPwQa2lc/FVzBcNJ7UAyJxM6wuqIj61tLrc4wSX0szH/Ev+nYRRuWlolflfl";
    link.crossOrigin = "anonymous";
    headID.appendChild(link);
    // create document container
    var container = doc.createElement('div');
    container.className = "container-fluid";
    doc.body.append(container);
    // add images to row array
    let currRow;
    let currColNum = 0;
    let currRowNum = -1;
    for (x in output) {
        let item = output[x];
        let row = item.style.row;
        let col = item.style.col;
        let colSize = item.style["col-size"];
        let docItem;
        if (item.type == IMG) {
            docItem = new Image();
            docItem.src = item.url;
            docItem.className += "col-" + colSize;
            docItem.style.height = "fit-content";
        } else if (item.type == P) {
            docItem = doc.createElement('p');
            docItem.innerHTML = item.content;
            docItem.className = "col-" + colSize + " px-2 pb-3";
        } else if (item.type == H1) {
            docItem = doc.createElement('h1');
            docItem.innerHTML = item.content;
            docItem.className = "col-" + colSize + " px-2 pb-3";
        }
        
        if (row > currRowNum) { // output should be in order
            // create row and append to container
            currRow = doc.createElement('div');
            currRow.className += "row gx-0"; // add gx-0 to eliminate gutter
            container.append(currRow);
            currRowNum++;
            currColNum = 0;
        }
        if (col > currColNum) {
            let spacer = doc.createElement('div');
            spacer.className = "col-" + (col - currColNum);
            currRow.append(spacer);
            currColNum = col;
        }
        // append image to row
        currRow.append(docItem);
        currColNum += colSize;
    }
    var iframeDoc = document.querySelector('iframe').contentDocument;
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
        files = event.target.files;
        document.getElementById("upload-message").innerHTML = "Folder uploaded!";
    }

});

function getFileName(fullPath) {
    var startIndex = (fullPath.indexOf('\\') >= 0 ? fullPath.lastIndexOf('\\') : fullPath.lastIndexOf('/'));
    var filename = fullPath.substring(startIndex);
    if (filename.indexOf('\\') === 0 || filename.indexOf('/') === 0) {
        filename = filename.substring(1);
    }
    return filename;
}

function optimize(input) {
    // set up image width to 100%, since we are using grids
    // place images into grid
    var row = 0;
    var col = 0;
    var rowCapacity = 12;
    var rowCapacities = [];
    for (x in input) {
        let item = input[x];
        // TODO randomize col size
        var colSize = 6;
        if (rowCapacity - colSize >= 0) {
            col = 12 - rowCapacity;
            rowCapacity -= colSize;
        } else {
            rowCapacities.push(rowCapacity);
            row++;
            col = 0;
            rowCapacity = 12 - colSize;
        }
        item["style"] = {
            "row": row,
            "col": col,
            "col-size": colSize
        }
    }
    rowCapacities.push(rowCapacity);
    //console.log(rowCapacities);
    //console.log(input);
    return optimizeIter(input, 0.3, rowCapacities);
}

function optimizeIter(input, threshold, rowCapacities) {

    /**
     * Rules
     * each row must have content
     * rows have mb
     * 
     * optimization moves
     * 1. set image to random grid size between 3 to 9 (probability 0.3)
     * 2. change image row, with possibility to add row (probability 0.3)
     * 3. add div as spacer to change col of image (probability 0.3)
     * 
     * Post processing
     * Remove empty rows
     */

    var iter = 0;
    var lastInput = JSON.parse(JSON.stringify(input));
    var lastRowCapacities = JSON.parse(JSON.stringify(rowCapacities));
    var cost = testCost(lastInput);

    while (cost > threshold) {
        let nextInput = JSON.parse(JSON.stringify(lastInput));
        let nextRowCapacities = JSON.parse(JSON.stringify(lastRowCapacities));
        let shuffleRows = [];
        // optimization moves
        for (x in nextInput) {
            let item = nextInput[x];
            let origRow = nextInput[x].style.row;
            let origCol = nextInput[x].style.col;
            let origColSize = nextInput[x].style["col-size"];
            let row = origRow;
            let col = origCol;
            let colSize = origColSize;
            let moveImage = false;
            // set image to random grid size
            if (Math.random() < 0.3) {
                colSize = 3 + Math.floor(Math.random() * 7);
                if (colSize > nextRowCapacities[origRow] + origColSize || colSize + col > 12) {
                    // move image
                    moveImage = true;
                    // will be negative, but will be fixed in the next section
                    nextRowCapacities[origRow] = nextRowCapacities[origRow] + origColSize - colSize;
                } else {
                    nextRowCapacities[origRow] = nextRowCapacities[origRow] + origColSize - colSize;
                }
            }
            // set image row
            if (moveImage || Math.random() < 0.3) {
                let newRow = false;
                // try to add image into an existing row
                if (Math.random() < 0.8) {
                    newRow = false;
                    let rowsAvailable = [];
                    for (y in nextRowCapacities) {
                        if (colSize <= nextRowCapacities[y]) {
                            rowsAvailable.push(parseInt(y));
                        }
                    }
                    if (rowsAvailable.length == 0) {
                        newRow = true;
                    } else {
                        rowIdx = Math.floor(Math.random() * rowsAvailable.length);
                        row = rowsAvailable[rowIdx];
                        nextRowCapacities[row] = nextRowCapacities[row] - colSize;
                        nextRowCapacities[origRow] = nextRowCapacities[origRow] + colSize;
                        shuffleRows[row] = true;
                    }
                } else {
                    newRow = true;
                }
                if (newRow) { // add new row
                    row = nextRowCapacities.length;
                    nextRowCapacities[origRow] = nextRowCapacities[origRow] + colSize;
                    nextRowCapacities.push(12 - colSize);
                    shuffleRows[row] = true;
                }
            }
            item["style"] = {
                "row": row,
                "col": col,
                "col-size": colSize
            }
        }
        let rowContent = [];
        // another pass to order elements, then another to set image column, reduce image rows
        for (x in nextInput) {
            let item = nextInput[x];
            let row = item.style.row;
            if (Array.isArray(rowContent[row])) {
                rowContent[row].push(item);
            } else {
                rowContent[row] = [item];
            }
        }
        let ordered = [];
        let rowCount = 0;
        let newRowCapacities = [];
        let shuffleRow = false;
        for (x in rowContent) {
            let currRow = rowContent[x];
            if (Array.isArray(currRow)) {
                let currRowCapacity = nextRowCapacities[x];
                if (currRowCapacity != 12) { // if row isn't empty
                    newRowCapacities.push(currRowCapacity);
                    if (shuffleRows[x] || Math.random() < 0.3) { // shuffle column
                        // use 0 to signify div column of size 1
                        currRow.push(...Array(currRowCapacity).fill(0));
                        shuffle(currRow);
                        let colCount = 0;
                        for (y in currRow) {
                            if (currRow[y] !== 0) { // if not spacer
                                let item = currRow[y];
                                item.style.col = colCount;
                                item.style.row = rowCount;
                                // push image into images array
                                ordered.push(item);
                                colCount += item.style["col-size"];
                            } else { // spacer
                                colCount++;
                            }
                        }
                    } else {
                        for (y in currRow) {
                            let item = currRow[y];
                            item.style.row = rowCount;
                            // push image into images array
                            ordered.push(item);
                        }
                    }
                    rowCount++;
                }
            }
        }
        nextRowCapacities = newRowCapacities;
        nextInput = ordered;

        // calculate new cost, replace if new < current
        let newCost = testCost(nextInput);
        if (newCost < cost) {
            lastInput = nextInput;
            lastRowCapacities = nextRowCapacities;
            cost = newCost;
        }
        //console.log(lastInput);
        //console.log(lastRowCapacities);
        //console.log(cost);
        iter++;
    }
    console.log(iter);
    console.log(lastInput);
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

// test cost function, largest distance = least cost
function testCost(input) {
    if (input.length < 2) {
        return 0;
    }
    let cost = 0;
    for (x = 0; x < input.length - 1; x++) {
        let y;
        for (y = x + 1; y < input.length; y++) {
            let rowX = input[x].style.row;
            let colX = input[x].style.col;
            let colSizeX = input[x].style["col-size"];
            let endColX = colX + colSizeX - 1;
            let rowY = input[y].style.row;
            let colY = input[y].style.col;
            let colSizeY = input[y].style["col-size"];
            let endColY = colY + colSizeY - 1;
            let vertDist = Math.abs(rowY - rowX);
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
                horizDist = ((1 - overlap / colSizeX) + (1 - overlap / colSizeY)) / 2; //TODO
            }
            cost += 1 / (horizDist + vertDist);
        }
    }
    // average over number of pairs, (n*(n-1))/2
    cost *= 2 / (input.length * (input.length - 1));
    return cost;
}

function distributionCost(input) {
    if (input.length < 2) {
        return 0;
    }
    let dist = [];
    let cost = 0;
    let sum = 0;
    // compute mean dist
    for (x = 0; x < input.length - 1; x++) {
        let y;
        for (y = x + 1; y < input.length; y++) {
            let rowX = input[x].style.row;
            let colX = input[x].style.col;
            let colSizeX = input[x].style["col-size"];
            let endColX = colX + colSizeX - 1;
            let rowY = input[y].style.row;
            let colY = input[y].style.col;
            let colSizeY = input[y].style["col-size"];
            let endColY = colY + colSizeY - 1;
            let vertDist = Math.abs(rowY - rowX);
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
                horizDist = ((1 - overlap / colSizeX) + (1 - overlap / colSizeY)) / 2; //TODO
            }
            let currDist = Math.sqrt(horizDist * horizDist + vertDist * vertDist);
            sum += currDist;
            dist.push(currDist);
        }
    }
    // compute variance
}