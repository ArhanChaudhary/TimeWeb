const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = {
    entry: [
        './timeweb/timewebapp/static/timewebapp/js/utils.js',
        './timeweb/timewebapp/static/timewebapp/js/priority.js',
        './timeweb/timewebapp/static/timewebapp/js/graph.js',
        './timeweb/timewebapp/static/timewebapp/js/parabola.js',
        './timeweb/timewebapp/static/timewebapp/js/crud.js',
    ],
    output: {
        // path: "./timeweb/timewebapp/static/timewebapp/js",
        path: path.resolve(__dirname, "timeweb/timewebapp/static/timewebapp/js"),
        filename: "bundle.js"
    },
    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    keep_classnames: true,
                },
            })
        ],
    },
    mode: "production",
};