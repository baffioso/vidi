/*
 * @author     Martin Høgh <mh@mapcentia.com>
 * @copyright  2013-2018 MapCentia ApS
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

'use strict';

var extensions;
var modules;
var tmpl;
var urlparser = require('./../modules/urlparser');
var urlVars = urlparser.urlVars;
var backboneEvents;
let jquery = require('jquery');
require('snackbarjs');

const semver = require('semver');
require("bootstrap");

module.exports = {

    /**
     *
     * @param o
     * @returns {exports}
     */
    set: function (o) {
        modules = o;
        backboneEvents = o.backboneEvents;
        return this;
    },

    /**
     *
     */
    init: function () {
        var me = this, configFile, stop = false;

        var loadConfig = function () {
            $.getJSON("/api/config/" + urlparser.db + "/" + configFile, function (data) {
                window.vidiConfig.brandName = data.brandName ? data.brandName : window.vidiConfig.brandName;
                window.vidiConfig.baseLayers = data.baseLayers ? data.baseLayers : window.vidiConfig.baseLayers;
                window.vidiConfig.enabledExtensions = data.enabledExtensions ? data.enabledExtensions : window.vidiConfig.enabledExtensions;
                window.vidiConfig.searchConfig = data.searchConfig ? data.searchConfig : window.vidiConfig.searchConfig;
                window.vidiConfig.aboutBox = data.aboutBox ? data.aboutBox : window.vidiConfig.aboutBox;
                window.vidiConfig.enabledSearch = data.enabledSearch ? data.enabledSearch : window.vidiConfig.enabledSearch;
                window.vidiConfig.schemata = data.schemata ? data.schemata : window.vidiConfig.schemata;
                window.vidiConfig.template = data.template ? data.template : window.vidiConfig.template;
                window.vidiConfig.enabledPrints = data.enabledPrints ? data.enabledPrints : window.vidiConfig.enabledPrints;
                window.vidiConfig.activateMainTab = data.activateMainTab ? data.activateMainTab : window.vidiConfig.activateMainTab;
                window.vidiConfig.extensionConfig = data.extensionConfig ? data.extensionConfig : window.vidiConfig.extensionConfig;
                window.vidiConfig.singleTiled = data.singleTiled ? data.singleTiled : window.vidiConfig.singleTiled;
                window.vidiConfig.doNotCloseLoadScreen = data.doNotCloseLoadScreen ? data.doNotCloseLoadScreen : window.vidiConfig.doNotCloseLoadScreen;
            }).fail(function () {
                console.log("Could not load: " + configFile);

                if (stop) {
                    me.getVersion();
                    return;
                }

                if (window.vidiConfig.defaultConfig) {
                    configFile = window.vidiConfig.defaultConfig;
                    stop = true;
                    loadConfig();
                }
            }).done(function () {
                me.getVersion();
            });
        };

        if (urlVars.config) {
            configFile = urlVars.config;
        } else if (window.vidiConfig.autoLoadingConfig) {
            configFile = urlparser.db + ".json";
        } else if (window.vidiConfig.defaultConfig) {
            configFile = window.vidiConfig.defaultConfig;
        }

        if (configFile) {
            loadConfig();
        } else {
            me.getVersion();
        }
    },

    getVersion: function () {
        var me = this;
        $.getJSON(`/app/${urlparser.db}/public/version.json`, function (data) {
            window.vidiConfig.appVersion = data.version;
            window.vidiConfig.appExtensionsBuild = '0';
            if (`extensionsBuild` in data) {
                window.vidiConfig.appExtensionsBuild = data.extensionsBuild;
            }
        }).fail(function () {
            console.error(`Unable to detect the current application version`);
        }).always(function () {
            me.render();
        });
    },


    /**
     *
     */
    render: function () {
        var me = this;

        // Render template and set some styling
        // ====================================

        if (typeof window.vidiConfig.template === "undefined") {
            tmpl = "default.tmpl";
        } else {
            tmpl = window.vidiConfig.template;
        }

        // Check if template is set in URL vars
        // ====================================

        if (typeof urlVars.tmpl !== "undefined") {
            var par = urlVars.tmpl.split("#");
            if (par.length > 1) {
                par.pop();
            }
            tmpl = par.join();
        }

        // If px and py is provided for print templates,
        // add the values to the dict before rendering
        // =============================================

        if (urlVars.px && urlVars.py) {
            gc2i18n.dict.printWidth = urlVars.px + "px";
            gc2i18n.dict.printHeight = urlVars.py + "px";
            gc2i18n.dict.printDataTime = decodeURIComponent(urlVars.td); // TODO typo
            gc2i18n.dict.printDateTime = decodeURIComponent(urlVars.td);
            gc2i18n.dict.printDate = decodeURIComponent(urlVars.d);
            window.vidiTimeout = 1000;
        } else {
            window.vidiTimeout = 0;
        }

        if (urlVars.l) {
            gc2i18n.dict._showLegend = urlVars.l;
        }
        gc2i18n.dict._showHeader = urlVars.h || "inline";
        gc2i18n.dict.brandName = window.vidiConfig.brandName;
        gc2i18n.dict.aboutBox = window.vidiConfig.aboutBox;

        // Render the page
        // ===============

        if (typeof Templates[tmpl] !== "undefined") {
            $("#main-container").html(Templates[tmpl].render(gc2i18n.dict));
            console.info("Using pre-processed template: " + tmpl);
            me.startApp();
        } else {
            $.get("/api/template/" + urlparser.db + "/" + tmpl, function (template) {
                var rendered = Mustache.render(template, gc2i18n.dict);
                $("#main-container").html(rendered);
                console.info("Loaded external template: " + tmpl);
                me.startApp();
            }).fail(function () {
                alert("Could not load template: " + tmpl);
            })
        }
    },

    /**
     *
     */
    startApp: function () {

        // Load style sheet
        //===================

        $('<link/>').attr({
            rel: 'stylesheet',
            type: 'text/css',
            href: '/css/styles.css'
        }).appendTo('head');

        // Add the tooltip div
        // ===================

        $("body").append('<div id="tail" style="position: fixed; float: left; display: none"></div>');

        // Detect the database and schema
        let splitLocation = window.location.pathname.split(`/`);
        if (splitLocation.length === 4 || splitLocation.length === 5) {
            let database = splitLocation[2];
            let schema = splitLocation[3];
            if (!database || database.length === 0 || !schema || schema.length === 0) {
                console.warn(`Unable to detect current database and schema`);
            } else {
                window.vidiConfig.appDatabase = database;
                window.vidiConfig.appSchema = schema;
            }
        } else {
            console.warn(`Unable to detect current database and schema`);
        }

        // Init the modules
        // ================

        modules.cloud.init();
        modules.state.setExtent();

        // Calling mandatory init method
        [`backboneEvents`, `socketId`, `bindEvent`, `baseLayer`, `infoClick`,
            `advancedInfo`, `draw`, `measurements`, `stateSnapshots`, `print`, `layerTree`].map(name => {
            modules[name].init();
        });

        /**
         * Fetch meta > initialize settings > create layer tree >
         * initialize state > load layers > initialize extensions > finish
         */
        modules.meta.init().then(() => {
            return modules.setting.init();
        }, (error) => {
            console.log(error); // Stacktrace
            alert("Vidi is loaded without schema. Can't set extent or add layers");
            backboneEvents.get().trigger("ready:meta");
        }).then(() => {
            return modules.layerTree.create();
        }).finally(() => {
            modules.state.init().then(() => {

                //try {

                    // Require search module
                    // =====================

                    // Hack to compile Glob files. Don´t call this function!
                    function ಠ_ಠ() {
                        require('./search/*.js', {glob: true});
                    }

                    if (typeof vidiConfig.searchModules !== "undefined") {
                        $.each(vidiConfig.searchModules, function (i, v) {
                            modules.search[v] = require('./search/' + v + '.js');
                            modules.search[v].set(modules);
                        });
                        modules.search[window.vidiConfig.enabledSearch].init();
                    }

                    // Require extensions modules
                    // ==========================

                    //Hack to compile Glob files. Don´t call this function!
                    function ಠ_ಠ() {
                        require('./../../extensions/*/browser/*.js', {glob: true});
                        require('./../../extensions/*/browser/*/*.js', {glob: true});
                    }

                    if (typeof vidiConfig.extensions !== "undefined" && typeof vidiConfig.extensions.browser !== "undefined") {
                        $.each(vidiConfig.extensions.browser, function (i, v) {
                            modules.extensions[Object.keys(v)[0]] = {};
                            $.each(v[Object.keys(v)[0]], function (n, m) {
                                modules.extensions[Object.keys(v)[0]][m] = require('./../../extensions/' + Object.keys(v)[0] + '/browser/' + m + ".js");
                                modules.extensions[Object.keys(v)[0]][m].set(modules);
                            })
                        });

                        if (typeof window.vidiConfig.enabledExtensions === "object") {
                            let enabledExtensionsCopy = JSON.parse(JSON.stringify(window.vidiConfig.enabledExtensions));
                            $.each(vidiConfig.extensions.browser, function (i, v) {
                                $.each(v[Object.keys(v)[0]], function (n, m) {
                                    if (window.vidiConfig.enabledExtensions.indexOf(Object.keys(v)[0]) > -1) {
                                        modules.extensions[Object.keys(v)[0]][m].init();
                                        let enabledExtensionIndex = enabledExtensionsCopy.indexOf(Object.keys(v)[0]);
                                        if (enabledExtensionIndex > -1) {
                                            enabledExtensionsCopy.splice(enabledExtensionIndex, 1);
                                        }
                                    }
                                })
                            });

                            if (enabledExtensionsCopy.length > 0) {
                                console.warn('Following extensions need to be enabled, but they were not initially compiled: ' + JSON.stringify(enabledExtensionsCopy));
                            }
                        }
                    }

                    // Init some GUI stuff after modules are loaded
                    // ============================================
                    $("[data-toggle=tooltip]").tooltip();

                    $.material.init();
                    touchScroll(".tab-pane");
                    touchScroll("#info-modal-body-wrapper");
                    $("#loadscreentext").html(__("Loading data"));
                    if (window.vidiConfig.activateMainTab) {
                        setTimeout(function () {
                            $('#main-tabs a[href="#' + window.vidiConfig.activateMainTab + '-content"]').tab('show');
                        }, 200);
                    }

                    $(window).resize(function () {
                        setTimeout(function () {
                            modules.cloud.get().map.invalidateSize();
                        }, 100);
                    });

                // } catch (e) {
                //     console.error("Could not perform application initialization", e.message);
                // }
            });
        });

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/service-worker.bundle.js').then((registration) => {
                console.log('Service worker registration succeeded');
            }).catch(error => {
                console.error(`Unable to register the service worker, please load the application over HTTPS in order to use its full functionality`);
            });
        } else {
            console.warn(`Service workers are not supported in this browser, some features may be unavailable`);
        }

        if (window.localforage) {
            localforage.getItem('appVersion').then(versionValue => {
                localforage.getItem('appExtensionsBuild').then(extensionsBuildValue => {
                    if (versionValue === null) {
                        localforage.setItem('appVersion', window.vidiConfig.appVersion).then(() => {
                            localforage.setItem('appExtensionsBuild', window.vidiConfig.appExtensionsBuild).then(() => {
                                console.log(`Versioning: setting new application version (${window.vidiConfig.appVersion}, ${window.vidiConfig.appExtensionsBuild})`);
                            });
                        }).catch(error => {
                            throw new Error(`Unable to store current application version`);
                        });
                    } else {
                        // If two versions are correctly detected
                        if (semver.valid(window.vidiConfig.appVersion) !== null && semver.valid(versionValue) !== null) {
                            if (semver.gt(window.vidiConfig.appVersion, versionValue) ||
                                (window.vidiConfig.appVersion === versionValue && window.vidiConfig.appExtensionsBuild !== extensionsBuildValue)) {
                                jquery.snackbar({
                                    id: "snackbar-conflict",
                                    content: `Updating application to the newest version (current: ${versionValue}, extensions: ${extensionsBuildValue}, latest: ${window.vidiConfig.appVersion}, extensions: ${window.vidiConfig.appExtensionsBuild})?`,
                                    htmlAllowed: true,
                                    timeout: 2500
                                });
                                setTimeout(function () {
                                    let unregisteringRequests = [];
                                    // Unregister service worker
                                    navigator.serviceWorker.getRegistrations().then((registrations) => {
                                        for (let registration of registrations) {
                                            console.log(`Versioning: unregistering service worker`, registration);
                                            unregisteringRequests.push(registration.unregister());
                                            registration.unregister();
                                        }
                                    });
                                    Promise.all(unregisteringRequests).then((values) => {
                                        // Clear caches
                                        caches.keys().then(function (names) {
                                            for (let name of names) {
                                                console.log(`Versioning: clearing cache`, name);
                                                caches.delete(name);
                                            }
                                        });

                                        // Remove current app version
                                        localforage.removeItem('appVersion').then(() => {
                                            location.reload();
                                        });
                                    });
                                }, 3000);
                            } else {
                                console.info('Versioning: new application version is not available');
                            }
                        } else if (typeof value === "undefined" || semver.valid(value) === null) {
                            console.warn(`Seems like current application version is invalid, resetting it`);
                            localforage.setItem('appVersion', '1.0.0').then(() => {
                            }).catch(error => {
                                localforage.setItem('appExtensionsBuild', '0').then(() => {
                                }).catch(error => {
                                    throw new Error(`Unable to store current application version`);
                                });
                            });
                        }
                    }
                });
            });
        } else {
            throw new Error(`localforage is not available`);
        }
    }
};