# Zoom Bacground Generator

Hi, I’m Gracen Hoyle, and I was an intern at Filestack this summer. As a developer I went into my summer internship to gain practical work experience and I wanted to work on a project that was both relevant and interesting. Given the amount of time we’ve all been spending on Zoom, I thought this would be fun and a great way to dive into the Filestack API. 

In this tutorial, we will be building a Zoom Background Generator tool to help you create perfectly sized backgrounds for professional and personal video meetings. The final version of this tool will allow the user to download a modified version of their uploaded media as a widescreen image or video that can be used in Zoom as a virtual background image.

![Zoom Background Generator](https://blog.filestack.com/wp-content/uploads/2020/10/Zoom-Background-Generator-Workflow-Planner.png)

This is the planning flowchart for the ZBG. I intend to take a file, use workflows to check it for SFW, Copyright, and Viruses, then resize it to the proper aspect ratio before handing it back to the user to finish any transforms they want to do. Then the user will be able to download the file for use.


## The Workflow

First, we are creating a workflow using Filestack to filter the image. We don’t want the user to use an image for a professional setting that has NSFW content, copyrighted content they don’t own, or contains malware, so we will filter those types of files out.

![Workflow](https://blog.filestack.com/wp-content/uploads/2020/10/pasted-image-0.png)

This is the working workflow I used. It does not yet have Virus detection.
The workflow went through many iterations. First, we check the metadata to see what the image type is. Once detected, videos go through their own set of detections and conversions to make the video shorter for use, then are sent to the user. Images are currently checked for safety and copyright, then resized before being sent back to the user for [transformations](https://www.filestack.com/products/transformations/).

In the code, the file picker is set up to take an API key and the key of your workflow.

```
const apikey = 'YOUR_API_KEY';
const client = filestack.init(apikey);
const options = {
  maxFiles: 20,
  uploadInBackground: false,
  onOpen: () => console.log('opened!'),
  onUploadDone: (res) => console.log(res),
  storeTo: {
    workflows: ["YOUR_WORKFLOW_KEY"]
  },
};
client.picker(options).open();
```


## The Webhooks

Webhooks can be configured in the [Filestack developer portal](https://dev.filestack.com/signup/free/). Once the file has gone through the workflow, it is asynchronously processed and returned to the webhook.

Using a listener in the code, the ZBG receives a POST request with the JSON payload carrying the transformed image. That payload is then filtered and the image URL is pulled out and placed in the *FILE_URL* variable.

After creating the workflow we need to create a server that can receive our webhook. For that we will be using express and [socket.io](http://socket.io/). First of all we need to create a static server for our picker.

```
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
app.use(bodyParser.json());
app.get('/', (req, res) => {
 res.sendFile(__dirname + '/index.html');
});
http.listen(3000, () => {
 console.log('listening on *:3000');
});
```

With this our express app will be serving a static file with our picker and webhook result preview.
 
Now lets create an index.html file with picker integration.

```
<html>
 <head>
   <script
     src="//static.filestackapi.com/filestack-js/3.x.x/filestack.min.js"
     crossorigin="anonymous"
   ></script>
   <script src="/socket.io/socket.io.js"></script>
 </head>
 <body>
   <button id="upload">Upload file</button>
   <div id="result" style="width:800;height:600;padding:10px;border: 1px solid red; background-color: #aaa;">
   </div>
   <script>
     document.addEventListener('DOMContentLoaded', () => {
       const client = filestack.init('API_KEY');
       const options = {
         storeTo: {
           workflows: ['WORKFLOW_ID'],
         },
         onUploadDone: () => {
           document.querySelector('#result').innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:20px;color:red"> Waiting for results ...</div>'
         }
       };
       picker = client.picker(options);
       document.querySelector('#upload').addEventListener('click', () => {
         picker.open();
       });
   </script>
 </body>
</html>
```

In this part of the code after a file is uploaded picker will run the workflow with a given id and update the div with waiting for workflow results.  
 
As a next step, we need to create an endpoint for our webhook from the workflow so we can add it in our server code:

```
app.post('/webhook', (req, res) => {
 const result = req.body.text.results;
 res.status(200).send('ok');
});
```

This will handle the webhook request and send an ok status, informing Filestack that the webhook was received.
 
Next, we need to send our webhook result to the browser. We can do that using socket.io

```
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const STORE_TASK_NAME_JPG = 'final_store'; // final store task name for images
const STORE_TASK_NAME_VIDEO = 'final_store_video'; // final store task name for video
app.use(bodyParser.json());
app.get('/', (req, res) => {
 res.sendFile(__dirname + '/index.html');
});
app.post('/webhook', (req, res) => {
 if (req.body.action !== 'fs.workflow') {
   return
 }
 // consider that we have two store tasks for video and images
 const result = req.body.text.results[STORE_TASK_NAME_JPG] || req.body.text.results[STORE_TASK_NAME_VIDEO];
 io.emit('result', result);
 res.status(200).send('ok');
});
http.listen(3000, () => {
 console.log('listening on *:3000');
});
// results
```


## Final Thoughts

This is a very simple implementation of the Zoom Background Generator that can be easily modified to meet one’s needs.
