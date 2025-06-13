exports.BattleText = {};
if (!exports.BattleMovedex) exports.BattleMovedex = {};
if (!exports.BattlePokedex) exports.BattlePokedex = {};
if (!exports.BattleAbilities) exports.BattleAbilities = {};
if (!exports.BattleItems) exports.BattleItems = {};

exports.BattleDataLoader = (function() {
    var AVAILABLE_LANGUAGES = ['en', 'es'];
    var DEFAULT_LANGUAGE = 'en';
    var LANGUAGE_PREF_KEY = 'battle-language';
    
    var DATA_TYPES = [
        { name: 'text', exportName: 'BattleText' },
        { name: 'moves', exportName: 'BattleMovedex' },
        { name: 'pokedex', exportName: 'BattlePokedex' },
        { name: 'abilities', exportName: 'BattleAbilities' },
        { name: 'items', exportName: 'BattleItems' }
    ];
    
    var currentLanguage = DEFAULT_LANGUAGE;
    var isLoaded = {
        text: false,
        moves: false,
        pokedex: false,
        abilities: false,
        items: false
    };
    var pendingCallbacks = [];
    
    function getPreferredLanguage() {
        if (Storage && Storage.prefs) {
            var storedLang = Storage.prefs(LANGUAGE_PREF_KEY);
            if (storedLang && AVAILABLE_LANGUAGES.indexOf(storedLang) >= 0) {
                return storedLang;
            }
        }
        
        try {
            var browserLang = navigator.language.split('-')[0].toLowerCase();
            if (AVAILABLE_LANGUAGES.indexOf(browserLang) >= 0) {
                return browserLang;
            }
        } catch (e) {}
        
        return DEFAULT_LANGUAGE;
    }
    
    function loadDataFile(dataType, callback) {
        var filePath;
        
        if (currentLanguage === DEFAULT_LANGUAGE) {
            filePath = "/data/" + dataType.name;
        } else {
            filePath = "/data/" + currentLanguage + "/" + dataType.name;
        }
        filePath += ".js?" + Date.now(); // Cache busting
        
        var script = document.createElement('script');
        script.src = filePath;
        script.onload = function() {
            isLoaded[dataType.name] = true;
            if (callback) callback();
        };
        script.onerror = function() {
            console.error("Failed to load " + dataType.name + " file for '" + currentLanguage + "'");
            
            if (currentLanguage !== DEFAULT_LANGUAGE) {
                // Try to load the default language version instead
                var defaultScript = document.createElement('script');
                defaultScript.src = "/data/" + dataType.name + ".js?" + Date.now();
                defaultScript.onload = function() {
                    isLoaded[dataType.name] = true;
                    if (callback) callback();
                };
                defaultScript.onerror = function() {
                    console.error("Failed to load default " + dataType.name + " file");
                    if (callback) callback();
                };
                document.head.appendChild(defaultScript);
            } else {
                if (callback) callback();
            }
        };
        document.head.appendChild(script);
    }
    
    function loadTextFile(callback) {
        loadDataFile(DATA_TYPES[0], function() {
            // Check for April Fools' Day
            var today = new Date();
            if (today.getMonth() === 3 && today.getDate() === 1) {
                var afdScript = document.createElement('script');
                afdScript.src = "/data/text-afd.js?" + Date.now();
                afdScript.onload = function() {
                    if (callback) callback();
                };
                afdScript.onerror = function() {
                    if (callback) callback();
                };
                document.head.appendChild(afdScript);
            } else {
                if (callback) callback();
            }
        });
    }
    
    function loadAllData(callback) {
        for (var type in isLoaded) {
            isLoaded[type] = false;
        }
        
        var filesToLoad = DATA_TYPES.length;
        var fileLoadedCallback = function() {
            filesToLoad--;
            if (filesToLoad <= 0 && callback) {
                callback();
            }
        };
        
        loadTextFile(fileLoadedCallback);
        
        for (var i = 1; i < DATA_TYPES.length; i++) {
            loadDataFile(DATA_TYPES[i], fileLoadedCallback);
        }
    }
    
    function runCallbacks() {
        for (var i = 0; i < pendingCallbacks.length; i++) {
            pendingCallbacks[i]();
        }
        pendingCallbacks = [];
    }
    
    var api = {
        getLanguage: function() {
            return currentLanguage;
        },
        
        setLanguage: function(lang, callback) {
            if (AVAILABLE_LANGUAGES.indexOf(lang) === -1) {
                console.error("Language '" + lang + "' is not available. Using " + DEFAULT_LANGUAGE + " instead.");
                lang = DEFAULT_LANGUAGE;
            }
            
            if (Storage && Storage.prefs) {
                Storage.prefs(LANGUAGE_PREF_KEY, lang);
            }
            
            if (currentLanguage === lang && isLoaded.text) {
                if (callback) callback();
                return;
            }
            
            currentLanguage = lang;
            
            if (callback) pendingCallbacks.push(callback);

            loadAllData(runCallbacks);
        },
        
        getAvailableLanguages: function() {
            return AVAILABLE_LANGUAGES.slice();
        },
        
        isLoaded: function(dataType) {
            if (dataType) {
                return isLoaded[dataType];
            }

            for (var type in isLoaded) {
                if (!isLoaded[type]) return false;
            }
            return true;
        },
        
        reloadData: function(callback) {
            if (callback) pendingCallbacks.push(callback);
            loadAllData(runCallbacks);
        }
    };
    
    var initialLanguage = getPreferredLanguage();
    
    api.setLanguage(initialLanguage);
    
    return api;
})();