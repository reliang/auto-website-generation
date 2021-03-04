window.onload = () => {
    var doc = document.implementation.createHTMLDocument();
    doc.body.append('Hello World!');
    var iframeDoc = document.querySelector('iframe').contentDocument;
    iframeDoc.replaceChild(
        doc.documentElement,
        iframeDoc.documentElement
    );
}

var files;
var input;

function generateWebsite() {
    // init json
    input = {
        "images": []
    }

    // read files into json
    if (!files) {
        document.getElementById("upload-message").innerHTML = "No folder uploaded";
    } else {
        for (let i = 0; i < files.length; i++) {
            // Check if the file is an image.
            let file = files[i];
            let item = {};
            item["src"] = file.webkitRelativePath;
            item["url"] = URL.createObjectURL(file);
            let img = new Image();
            img.onload = function () {
                item["width"] = this.width;
                item["height"] = this.height;
                // width / height, >1 means width > height
                item["ratio"] = this.width / this.height;
            };
            img.src = item["url"];
            if (file.type && file.type.match('image.*')) {
                input.images.push(item);
            }

        }
    }

    // generate website from JSON object
    var doc = document.implementation.createHTMLDocument();

    for (x in input.images) {
        let img = new Image();
        img.src = input.images[x].url;
        console.log(input.images[x]);
        console.log(input.images[x].url);
        img.height = 250;
        doc.body.append(img);
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