// Express app
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const { compressionMiddleware, responseTimeMiddleware, paginationMiddleware } = require('./middleware/performance');
const { notFoundHandler } = require('./middleware/notFoundHandler');
const { errorHandler } = require('./middleware/errorHandler');
const { responseUrlMapping } = require('./middleware/responseMapping');

const routes = require('./routes'); 

const app = express();

// Core middleware
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(morgan('dev'));
app.use(compressionMiddleware);
app.use(responseTimeMiddleware);
app.use(paginationMiddleware);
app.use(responseUrlMapping);

// Static uploads
const uploadsDir = path.resolve(process.env.UPLOAD_DIR || 'uploads');
app.use('/uploads', express.static(uploadsDir));

// Health
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// API routes
app.use('/api', routes);

// 404 + Error
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;

// Run standalone
if (require.main === module) {
  const PORT = Number(process.env.PORT || 3000);
  app.listen(PORT, () => console.log(`Server running on :${PORT}`));
}

