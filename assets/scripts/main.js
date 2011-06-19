/*/////////////////////////////////////////////////////////////////////////
//                                                                       //
//   Switchy! Chrome Proxy Manager and Switcher                          //
//   Copyright (c) 2009 Mohammad Hejazi (mohammadhi at gmail d0t com)    //
//   Dual licensed under the MIT and GPL licenses.                       //
//                                                                       //
/////////////////////////////////////////////////////////////////////////*/

var iconDir = "assets/images/";
var iconInactivePath = "assets/images/inactive.png";
var refreshInterval = 10000;
var refreshTimer;
var currentProfile;

function init() {
	ProxyPlugin.init();
	applySavedOptions();
	checkFirstTime();
	setIconInfo(undefined);
	monitorProxyChanges(false);
	monitorTabChanges();
}

function checkFirstTime() {
	if (!Settings.keyExists("firstTime")) {
		Settings.setValue("firstTime", ":]");
		if (!ProfileManager.hasProfiles()) {
			Settings.setValue("version", appVersion);
			openOptions(true);
			return true;
		}
	}
	return false;
}

function openOptions(firstTime) {
	var url = "options.html";
	if (firstTime)
		url += "?firstTime=true";
	
	var fullUrl = chrome.extension.getURL(url);
	chrome.tabs.getAllInWindow(null, function(tabs) {
		for (var i in tabs) { // check if Options page is open already
			var tab = tabs[i];
			if (tab.url == fullUrl) {
				chrome.tabs.update(tab.id, { selected: true }); // select the tab
				return;
			}
		}
		chrome.tabs.getSelected(null, function(tab) { // open a new tab next to currently selected tab
			chrome.tabs.create({
				url: url,
				index: tab.index + 1
			});
		});
	});
}

function applySavedOptions() {
	if (!Settings.getValue("reapplySelectedProfile", false))
		return;
	
	var selectedProfile = ProfileManager.getSelectedProfile();
	if (selectedProfile != undefined)
		ProfileManager.applyProfile(selectedProfile);
}

function setIconBadge(text) {
	if (text == undefined)
		text = "";
	
	//chrome.browserAction.setBadgeBackgroundColor({ color: [75, 125, 255, 255] });
	chrome.browserAction.setBadgeBackgroundColor({ color: [90, 180, 50, 255] });
	chrome.browserAction.setBadgeText({ text: text });
}

function setIconTitle(title) {
	if (title == undefined)
		title = "";
	
	chrome.browserAction.setTitle({ title: title });
}

function setIconInfo(profile, preventProxyChanges) {

	if (!profile) {
		profile = ProfileManager.getCurrentProfile();
		if (preventProxyChanges) {
			var selectedProfile = ProfileManager.getSelectedProfile();
			if (!ProfileManager.equals(profile, selectedProfile)) {
				profile = selectedProfile;
				ProfileManager.applyProfile(profile);
			}
		}
	}
	
	currentProfile = profile;
	if (RuleManager.isAutomaticModeEnabled(profile)) {
//		var autoProfile = RuleManager.getAutomaticModeProfile();
//		profile = autoProfile;
//		profile.proxyConfigUrl = "";
//		profile.color = "auto-blue";
		if (setAutoSwitchIcon())
			return;
	}
	
	var title = "";
	if (profile.proxyMode == ProfileManager.ProxyModes.direct) {
		chrome.browserAction.setIcon({ path: iconInactivePath });
		title += profile.name;
	} else {
		var iconPath = iconDir + "icon-" + (profile.color || "blue") + ".png";
		chrome.browserAction.setIcon({ path: iconPath });
		title += ProfileManager.profileToString(profile, true);
	}

	setIconTitle(title);
}

function setAutoSwitchIcon(url) {
	if (!RuleManager.isAutomaticModeEnabled(currentProfile))
		return false;
	
	if (url == undefined) {
		chrome.tabs.getSelected(undefined, function(tab) {
			setAutoSwitchIcon(tab.url);
		});
		return true;
	}
	
	var color = undefined;
		var rule = RuleManager.getAssociatedRule(url) || RuleManager.getDefaultRule();
		var profileName = ProfileManager.directConnectionProfile.name;
		if (rule != undefined) {
			var profile = ProfileManager.getProfile(rule.profileId);
			color = profile.color;
			profileName = profile.name;
		}
	var iconPath = iconDir + "icon-auto-" + (color || "blue") + ".png";

	chrome.browserAction.setIcon({ path: iconPath });

	var title = "Auto Switch Mode";
		title += "\nActive Page Proxy: " + profileName;
	
	setIconTitle(title);
	
	return true;
}

function monitorProxyChanges(checkIfMonitorRunning) {
	if (checkIfMonitorRunning && refreshTimer)
		return;
	
	if (Settings.getValue("monitorProxyChanges", true)) {
		setIconInfo(undefined, Settings.getValue("preventProxyChanges", false));
		refreshTimer = setTimeout(monitorProxyChanges, refreshInterval, undefined);
	}
	else
		refreshTimer = undefined;
}

function monitorTabChanges() {
	chrome.tabs.onSelectionChanged.addListener(function(tabId, selectInfo) {
		chrome.tabs.get(tabId, function(tab) {
			setAutoSwitchIcon(tab.url);
		});
	});
	chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
		if (changeInfo.status == "complete") {
			chrome.tabs.getSelected(null, function(selectedTab) {
				if (selectedTab.id == tab.id)
					setAutoSwitchIcon(tab.url);
			});
		}
	});
}
