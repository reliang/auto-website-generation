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

const NUM_COL = 12;

const IMG = 0;
const P = 1;
const H1 = 2;
const LOGO = 3;
const BUTTON = 4;
const BG = 5;
const H3 = 6;

const h1 = /^# (.*$)/gim; // captures title
const p = /^(?!(!\[.*?\]\(.*?\))|[#\n])(.*$)/gm;// no lines starting with ![Any text](Any text), # any text, or \n
const image = /!\[.*?\]\((.*?)\)/gim; // captures url

var files;
var input;
var elements; // elements that don't need optimization
var numRows;

function generateWebsite() {
    // init json
    input = [];
    elements = [];

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

        let idx = 0;
        let h1Idx = -1;
        let h3Idx = -1;
        let pIdx = -1;
        let buttonIdx = -1;

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
                //console.log(getFileNameNoExtension(item["src"]));
                if (getFileNameNoExtension(item["src"]) === "logo") {
                    item["type"] = LOGO;
                } else if (getFileNameNoExtension(item["src"]) === "background") {
                    item["type"] = BG; // TODO: display background
                } else {
                    item["type"] = IMG;
                }
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
                    h1Idx = idx;
                } else if (getFileName(item["src"]) === "h3.txt") {
                    item["type"] = H3;
                    h3Idx = idx;
                } else if (getFileName(item["src"]) === "button.txt") {
                    item["type"] = BUTTON;
                    buttonIdx = idx;
                } else {
                    item["type"] = P;
                    pIdx = idx;
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
                input.push(item);
                idx++;
            }
            
        }
        // connect parent-child
        if (buttonIdx != -1) {
            let item = input[buttonIdx];
            if (pIdx != -1) {
                item["parent"] = pIdx;
            } else if (h1Idx != -1) {
                item["parent"] = h1Idx;
            }
        }
        if (pIdx != -1) {
            let item = input[pIdx];
            if (h1Idx != -1) {
                item["parent"] = h1Idx;
            }
        }

    }
}

// must wait for all files to be loaded before optimizing
function allLoaded() {
    // OPTIMIZE
    var output = optimize(input);

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
    docStyle.innerHTML += '.vertical-center {margin: 0; position: absolute; top: 50%; -ms-transform: translateY(-50%); transform: translateY(-50%);}';
    docStyle.innerHTML += '.button {background-color: #000000; border: none; color: white; padding: 10px 25px; text-align: center; text-decoration: none; display: inline-block; margin: 4px 2px; cursor: pointer; border-radius: 25px;}';
    doc.getElementsByTagName('head')[0].appendChild(docStyle);
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
    for (x in elements) {
        let item = elements[x];
        let docItem;
        if (item.type == LOGO) {
            docItem = new Image();
            docItem.src = item.url;
            docItem.style.paddingTop = "10px"
            docItem.style.height = navHeight - 20 + "px";
            docItem.style.gridRow = "1";
            docItem.style.gridColumn = "1";
        }
        nav.append(docItem);
    }
    // create document grid
    var grid = doc.createElement('div');
    grid.style.gridColumn = "2 / 3";
    grid.style.gridRow = "2 / 3";
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(" + NUM_COL + ", " + 100 / NUM_COL + "%)";
    grid.style.gridAutoRows = "minmax(min-content, max-content)";
    grid.className = "vertical-center";
    container.append(grid);
    // add items to grid
    for (x in output) {
        let item = output[x];
        let row = item.style.row;
        let col = item.style.col;
        let colSpan = item.style["col-span"];
        let rowSpan = item.style["row-span"];
        let docItem;
        if (item.type == IMG) {
            docItem = new Image();
            docItem.src = item.url;
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
            docItem = doc.createElement('h3');
            docItem.innerHTML = item.content;
            docItem.className = "px-4 pb-2";
        }
        docItem.style.gridRow = "" + (row + 1) + " / span " + rowSpan;
        docItem.style.gridColumn = "" + (col + 1) + " / span " + colSpan;
        grid.append(docItem);
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

function getFileNameNoExtension(fullPath) {
    var filename = getFileName(fullPath);
    var newFilename = filename.replace(/\.[^/.]+$/, "");
    return newFilename;
}

function optimize(input) {
    // set up image width to 100%, since we are using grids
    // place images into grid
    var row = 0;
    var col = 0;
    for (x in input) {
        let item = input[x];
        // TODO randomize col size, row & col
        var colSpan = 6;
        var rowSpan = 1;
        item["style"] = {
            "row": 0,
            "col": 0,
            "col-span": colSpan,
            "row-span": rowSpan
        }
    }
    //console.log(input);
    return optimizeIter(input);
}

function optimizeIter(input) {

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
    var costs = costSummary(lastInput);
    var cost = costs.overall;
    var currRowMax = 1;

    while (cost > 1 && iter < 1000) {
        let nextInput = JSON.parse(JSON.stringify(lastInput));
        let pIdx = -1;
        let buttonIdx = -1;
        // optimization moves
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
            if (nextInput[x].parent != null && nextInput[x].parent != undefined) {
                if (nextInput[x].type == P) {
                    pIdx = x;
                } else if (nextInput[x].type == BUTTON) {
                    buttonIdx = x;
                }
            } else {
                // set item to random col span
                if (Math.random() < 0.2) {
                    colSpan = 4 + Math.floor(Math.random() * 5);
                    if (col + colSpan > NUM_COL) {
                        col = NUM_COL - colSpan;
                    }
                }
                // set image to random row span
                if (Math.random() < 0.2 && item.type == IMG) {
                    rowSpan = 1 + Math.floor(Math.random() * 3);
                    if (currRowMax < rowSpan + row) {
                        currRowMax = rowSpan + row;
                    }
                }
                // set item row
                if (Math.random() < 0.2) {
                    // try to add item into an existing row
                    if (Math.random() < 0.9) {
                        row = Math.floor(Math.random() * currRowMax);
                        if (currRowMax < rowSpan + row) {
                            currRowMax = rowSpan + row;
                        }
                    } else {
                        row = currRowMax;
                        currRowMax++;
                    }
                }
                // set item col
                if (Math.random() < 0.2) {
                    col = Math.floor(Math.random() * (NUM_COL - colSpan));
                }
            }

            item["style"] = {
                "row": row,
                "col": col,
                "col-span": colSpan,
                "row-span": rowSpan
            }
        }
        // set P to be row under parent (H1), with same col and colspan
        if (pIdx != -1) {
            let item = nextInput[pIdx];
            let parentIdx = item.parent;
            let row = nextInput[parentIdx].style.row + 1;
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
        if (buttonIdx != -1) {
            let item = nextInput[buttonIdx];
            let parentIdx = item.parent;
            let row = nextInput[parentIdx].style.row + 1;
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
        let rowContent = [];
        for (x in nextInput) {
            // if element has parent (have to make sure parent is already processed)
            if (nextInput[x].parent != null && nextInput[x].parent != undefined) {
                //console.log("has parent");
                // set P to be row under parent (H1), with same col and colspan
                if (nextInput[x].type == P || nextInput[x].type == BUTTON) {
                    parentIdx = nextInput[x].parent;
                    row = nextInput[parentIdx].style.row + 1;
                    col = nextInput[parentIdx].style.col;
                    colSpan = nextInput[parentIdx].style["col-span"];
                }
            }
        }
        // another pass to order elements, then another to reduce empty rows
        let rowHasContent = new Array(currRowMax);
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
                    for (y in currRow) {
                        let item = currRow[y];
                        item.style.row = rowCount;

                    }
                }
                rowCount++;
            }
        }
        numRows = rowCount;

        // calculate new cost, replace if new < current
        let newCosts = costSummary(nextInput);
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

function overallCost(input) {
    let cost = 3 * clearanceCost(input) + 1 * distributionCost(input) + 4 * spaceUsageCost(input) + 2 * alignmentCost(input);
    //let cost = 1 * clearanceCost(input);
    //console.log("total cost: " + cost);
    return cost;
}

function costSummary(input) {
    let clearance = 3 * clearanceCost(input);
    let distribution = 1 * distributionCost(input);
    let spaceUsage = 4 * spaceUsageCost(input);
    let alignment = 2 * alignmentCost(input);
    let overallCost = clearance + distribution + spaceUsage + alignment;
    let cost = {
        "overall" : overallCost,
        "clearance" : clearance,
        "distribution" : distribution,
        "space-usage" : spaceUsage,
        "alignment" : alignment
    }
    return cost;
}


// test cost function, largest L1 = least cost
function testCost(input) {
    if (input.length < 2) {
        return 0;
    }
    let cost = 0;
    for (x = 0; x < input.length - 1; x++) {
        let y;
        for (y = x + 1; y < input.length; y++) {
            cost += 1 / L1(input, x, y);
        }
    }
    // average over number of pairs, (n*(n-1))/2
    cost *= 2 / (input.length * (input.length - 1));
    return cost;
}

function spaceUsageCost(input) {
    let totalArea = NUM_COL * numRows;
    let freeArea = totalArea;
    let cost;
    for (x = 0; x < input.length; x++) {
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
    for (x = 0; x < input.length - 1; x++) {
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
            if (hasParent(input[x].type) || hasParent(input[y].type)) {
                continue;
            }
            if (input[x].type == H1 || input[y].type == H1) {
                if (rowX != rowY) {
                    currCost++;
                }
                cost += currCost;
                numPairs++;
            }
        }
    }
    // average over number of pairs, (n*(n-1))/2
    cost /= numPairs;
    //console.log("alignment cost: " + cost);
    return cost;
}

// title above text, and title close to text
function textProximityCost(input) {
    if (input.length < 2) {
        return 0;
    }
    let cost = 0;
    let numPairs = 0;
    for (x = 0; x < input.length - 1; x++) {
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
    // average over number of pairs, (n*(n-1))/2
    cost /= numPairs;
    return cost;
}

function isText(type) {
    if (type == P || type == H1) {
        return true;
    } else {
        return false;
    }
}

function hasParent(type) {
    if (type == P || type == BUTTON) {
        return true;
    } else {
        return false;
    }
}

function pageMarginCost(input) {
    let cost = 0;
    let numItems = 0;
    // all items
    for (x = 0; x < input.length; x++) {
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

function clearanceCost(input) {
    if (input.length < 2) {
        return 0;
    }
    let cost = 0;
    // compute overlap area over own area
    for (x = 0; x < input.length - 1; x++) {
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
    for (x = 0; x < input.length - 1; x++) {
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
    for (x = 0; x < dist.length; x++) {
        let stdDev = dist[x] / distMax - mean;
        cost += stdDev * stdDev;
    }
    //console.log("distribution cost: " + cost);
    return cost;
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