// services/backend/src/server.js
const express = require('express');
const app = express();
app.use(express.json());
const omnichannel = require('./omnichannel_fallback');
app.use('/api/omnichannel', omnichannel);
const omnichannelHelpers = require('./omnichannel_helpers');
app.use('/api/omnichannel', omnichannelHelpers);
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Backend listening on ${port}`));
