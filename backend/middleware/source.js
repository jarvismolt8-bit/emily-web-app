function sourceMiddleware(req, res, next) {
  const sourceHeader = req.headers['x-source'];
  
  if (sourceHeader && ['telegram', 'web_app', 'system'].includes(sourceHeader)) {
    req.source = sourceHeader;
  } else {
    req.source = 'web_app';
  }
  
  next();
}

module.exports = sourceMiddleware;
