/**
* Copyright 2019 IBM Corp. All Rights Reserved.
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

const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const ebl = require('express-bunyan-logger');
const verifyOrgKey = require('../../utils/orgs.js').verifyOrgKey;
const uuid = require('uuid');

const getBunyanConfig = require('../../utils/bunyan.js').getBunyanConfig;

router.use(ebl(getBunyanConfig('razeedash-api/orgs')));

const createOrg = async(req, res) => {
  const orgName = (req.body && req.body.name) ? req.body.name.trim() : null;
  
  if(!orgName) {
    req.log.warn(`An org name was not specified on route ${req.url}`);
    return res.status(400).send( 'An org name is required' );
  }
  
  const Orgs = req.db.collection('orgs');
  const foundOrg = await Orgs.findOne({'name': orgName});
  if(foundOrg){
    req.log.warn( 'The org ${orgName} org already exists' );
    return res.status(400).send( 'This org already exists' );
  }

  const orgAdminKey = req.orgAdminKey; // this was set in verifyOrgKey()
  const orgApiKey = `orgApiKey-${uuid()}`;
  try {
    const insertedOrg = await Orgs.insertOne({
      'name': orgName,
      'orgKeys' : [ orgApiKey ],
      'orgAdminKey': orgAdminKey,
      'created': new Date(),
      'updated': new Date()
    });

    if(insertedOrg.result.ok) {
      return res.status(200).send( insertedOrg.ops[0] );
    } else {
      req.log.error(insertedOrg);
      return res.status(500).send( `Could not create the ${orgName} org` );
    }
  } catch (error) {
    req.log.error(error);
    return res.status(500).send( `Error creating the ${orgName} org` );
  }
};

// /api/v2/orgs
router.post('/', asyncHandler(verifyOrgKey), asyncHandler(createOrg));

module.exports = router;
