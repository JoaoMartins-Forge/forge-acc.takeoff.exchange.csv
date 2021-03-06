/////////////////////////////////////////////////////////////////////
// Copyright (c) Autodesk, Inc. All rights reserved
// Written by Forge Partner Development
//
// Permission to use, copy, modify, and distribute this software in
// object code form for any purpose and without fee is hereby granted,
// provided that the above copyright notice appears in all copies and
// that both that copyright notice and the limited warranty and
// restricted rights notice below appear in all supporting
// documentation.
//
// AUTODESK PROVIDES THIS PROGRAM "AS IS" AND WITH ALL FAULTS.
// AUTODESK SPECIFICALLY DISCLAIMS ANY IMPLIED WARRANTY OF
// MERCHANTABILITY OR FITNESS FOR A PARTICULAR USE.  AUTODESK, INC.
// DOES NOT WARRANT THAT THE OPERATION OF THE PROGRAM WILL BE
// UNINTERRUPTED OR ERROR FREE.
/////////////////////////////////////////////////////////////////////

'use strict';   


var express = require('express'); 
var router = express.Router(); 

var bodyParser = require('body-parser');
var jsonParser = bodyParser.json(); 
var config = require('../config'); 

const { apiClientCallAsync } = require('./common/apiclient');
const { OAuth } = require('./common/oauth');


/////////////////////////////////////////////////////////////////////////////
// Add String.format() method if it's not existing
if (!String.prototype.format) {
  String.prototype.format = function () {
      var args = arguments;
      return this.replace(/{(\d+)}/g, function (match, number) {
          return typeof args[number] != 'undefined'
              ? args[number]
              : match
              ;
      });
  };
}


const TokenType = {
  TWOLEGGED: 0,
  THREELEGGED: 1,
  NOT_SUPPORTED: 9
}


///////////////////////////////////////////////////////////////////////
/// Middleware for obtaining a token for each request.
///////////////////////////////////////////////////////////////////////
router.use(async (req, res, next) => {
  const oauth = new OAuth(req.session);
  req.oauth_client = oauth.getClient();
  req.oauth_token = await oauth.getInternalToken();  
  next();   
});


/////////////////////////////////////////////////////////////////////////////////////////////
/// get different data of takeoff type
/////////////////////////////////////////////////////////////////////////////////////////////
router.get('/takeoff/info', jsonParser, async function (req, res) {
  const projectId = req.query.projectId.split('.')[1];
  const packageId = req.query.packageId;
  const systemId = req.query.systemId;
  if (!projectId) {
    console.error('project id is not provided.');
    return (res.status(400).json({
      diagnostic: 'project id is not provided.'
    }));
  }  

  let takeoffUrl = null;
  const takeoffData = req.query.takeoffData;
  switch( takeoffData ){
    case 'packages':{
      takeoffUrl =  config.takeoff.URL.PACKAGES_URL.format(projectId);
      break;
    };
    case 'items':{
      takeoffUrl =  config.takeoff.URL.ITEMS_URL.format(projectId, packageId);
      break;
    };
    case 'types':{
      takeoffUrl = config.takeoff.URL.TAKEOFF_TYPES.format(projectId, packageId);
      break;
    };
    case 'systems':{
      takeoffUrl = config.takeoff.URL.CLASSIFICATION_SYSTEMS.format(projectId);
      break;
    };
    case 'classifications':{
      takeoffUrl = config.takeoff.URL.ALL_CLASSIFICATIONS.format(projectId, systemId);
      break;
    };
    case 'views':{
      takeoffUrl = config.takeoff.URL.CONTENT_VIEW.format(projectId, systemId);
      break;
    };
  };
  let takeoffInfoRes = [];
  try {
    let newTakeoffInfoRes = await apiClientCallAsync('GET', takeoffUrl, req.oauth_token.access_token);
    takeoffInfoRes.push(...newTakeoffInfoRes.body.results);
    let offset = 0;
    while(newTakeoffInfoRes.body.pagination.nextUrl != null){
      offset += newTakeoffInfoRes.body.results.length;
      newTakeoffInfoRes = await apiClientCallAsync('GET', takeoffUrl, req.oauth_token.access_token, null, offset);
      takeoffInfoRes.push(...newTakeoffInfoRes.body.results);
    }
  } catch (err) {
    console.error(err)
    return (res.status(500).json({
      diagnostic: 'failed to get the takeoff info'
    }));
  }
  return (res.status(200).json(takeoffInfoRes));
})


module.exports = router