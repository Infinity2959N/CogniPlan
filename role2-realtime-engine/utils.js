// Throttling: Limits the execution of a function to once every 'delay' ms
const throttle = (func, delay) => {
    let lastTime = 0;
    return (...args) => {
        const now = new Date().getTime();
        if (now - lastTime < delay) return;
        lastTime = now;
        return func(...args);
    };
};

module.exports = { throttle };