/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var express = require('express'); // app server
var bodyParser = require('body-parser'); // parser for post requests
var Conversation = require('watson-developer-cloud/conversation/v1'); // watson sdk

var app = express();

// Bootstrap application settings
app.use(express.static('./public')); // load UI from public folder
app.use(bodyParser.json());

// Create the service wrapper
var conversation = new Conversation({
  // If unspecified here, the CONVERSATION_USERNAME and CONVERSATION_PASSWORD env properties will be checked
  // After that, the SDK will fall back to the bluemix-provided VCAP_SERVICES environment property
  'username': process.env.CONVERSATION_USERNAME,
  'password': process.env.CONVERSATION_PASSWORD,
  'version': 'v1',
  'version_date': Conversation.VERSION_DATE_2017_05_26
});

/* Code to parse csv file */
var csv = require('node-csv').createParser(';');
var csvdata = []
var filename = "data.csv";
csv.mapFile(filename, function(err, data) {
    csvdata = data;
});


// Endpoint to be call from the client side
app.post('/api/message', function(req, res) {
  var workspace = process.env.WORKSPACE_ID || '<workspace-id>';
  if (!workspace || workspace === '<workspace-id>') {
    return res.json({
      'output': {
        'text': 'The app has not been configured with a <b>WORKSPACE_ID</b> environment variable. Please refer to the ' + '<a href="https://github.com/watson-developer-cloud/conversation-simple">README</a> documentation on how to set this variable. <br>' + 'Once a workspace has been defined the intents may be imported from ' + '<a href="https://github.com/watson-developer-cloud/conversation-simple/blob/master/training/car_workspace.json">here</a> in order to get a working application.'
      }
    });
  }
  var payload = {
    workspace_id: workspace,
    context: req.body.context || {},
    input: req.body.input || {},
    alternate_intents: true
  };

  // Send the input to the conversation service
  conversation.message(payload, function(err, data) {
    if (err) {
      return res.status(err.code || 500).json(err);
    }
     // conversation service provides the ticket number
     var ticketnum = data.context.ticketnum;
     var checkStatus = data.context.checkStatus;
     
     if(ticketnum && data.output.action == "checkStatus") {
       // check the status for the ticket
       var status = getStatus(ticketnum);
       // If ticket is not in the system, return a response indicating so
       if(status == -1) {
	data.output.text = "I couldn't find ticket number " + ticketnum + " in our system. " + "Would you like to discuss with an agent?";
       } else {
	// Otherwise, if you find the ticket, return its status
        data.output.text = "your ticket " + ticketnum + " is " + status;
       }
     }
    return res.json(data);
  });
});

// return ticket status by finding the record that matches the ticket number and returning its status
function getStatus(ticketnum) {
  var status = "closed";

  var result = csvdata.filter(function(item) {
		return item.Incident == ticketnum;
		});
  if(result.length > 0) {
    status = result[0].Status;
  } else {
    status = -1;
  }
  return status;
}

module.exports = app;
