function notFoundHandler(req, res) {
    res.status(404).json({
        error: {message: 'Not found', status: 404},
    });
}

module.exports = { notFoundHandler };