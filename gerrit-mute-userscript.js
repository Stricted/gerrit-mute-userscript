//
// Copyright 2017 Greg Sheremeta <greg@gregsheremeta.com>
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// ==UserScript==
// @name         gerrit-mute-userscript
// @namespace    http://www.gregsheremeta.com
// @version      0.1
//               NOTE: developed against Gerrit 2.13.8
// @description  gerrit-mute-userscript is a Tampermonkey / greasemonkey script that adds a "Muted" section and allows reviewer to mute patches
// @author       greg@gregsheremeta.com
//
// @match        https://gerrit.ovirt.org/
//
// @grant GM_setValue
// @grant GM_getValue
// @grant GM_log
// @require http://userscripts-mirror.org/scripts/source/107941.user.js
// @require http://code.jquery.com/jquery-3.2.1.min.js
//
// ==/UserScript==

(function() {
    'use strict';

    // JS interval handle
    var muteIntervalHandle;

    var intervalOneSpeed = 200;
    var intervalOneLoops = 30;
    var intervalTwoSpeed = 5000;

    var dashboardUrl = '#/dashboard/self';

    var muteButtonHtml = '<button id="btn_mute" type="button" title="Mute"><div>Mute</div></button>';
    var mutedSectionHeader = '<tr id="muted-header"><td colspan="14" class="sectionHeader"><a class="gwt-InlineHyperlink" href="javascript:;">Muted</a></td></tr>';

    var mutedListKey = 'GERRIT_MUTE_LIST';

    var loops = 0;

    var addMuteButton = function(changeId) {
        GM_log("addMuteButton");
        var $button = $(muteButtonHtml);
        $("#change_actions").append($button);
        $("#btn_mute").click(function() {
            muteChangeId(changeId);
            window.location = dashboardUrl;
        });
    };

    var muteRows = function() {
        GM_log("muteRows");
        var mutedChanges = GM_getValue(mutedListKey).split(",");
        $("tr.needsReview td.cSUBJECT a").each(function(index, el) {
            var href = $(el).prop("href");
            var pieces = href.split(/\//);
            var changeId = pieces[pieces.length - 1];
            if (mutedChanges.indexOf(changeId) >= 0) {
                // move this row to the Muted section
                var row = $(el).closest('tr.needsReview').detach();
                if (!$("#muted-header").length) {
                    addMutedHeader();
                }
                $("table.changeTable tbody").append($(row));
            }
        });

        // interval management -- after x loops, slow down the check
        loops++;
        if (loops >= intervalOneLoops) {
            muteRowsAtInterval(intervalTwoSpeed);
        }
    };

    var muteRowsAtInterval = function(interval) {
        var i = interval ? interval : intervalOneSpeed;
        if (muteIntervalHandle) {
            clearInterval(muteIntervalHandle);
        }
        muteIntervalHandle = setInterval(muteRows, i);
    };

    var muteChangeId = function(changeId) {
        GM_log("muteChangeId " + changeId);
        var value = GM_getValue(mutedListKey);
        if (value.length === 0) {
            GM_setValue(mutedListKey, changeId);
        }
        else {
            var mutedChanges = GM_getValue(mutedListKey).split(",");
            if (mutedChanges.indexOf(changeId) < 0) {
                mutedChanges.push(changeId);
                mutedChanges.sort();
                // persist
                GM_setValue(mutedListKey, mutedChanges.join(","));
            }
            else {
                GM_log(changeId + " is already muted");
            }
        }
    };

    var addMutedHeader = function() {
        var $el = $(mutedSectionHeader);
        $("table.changeTable tbody").append($el);
    };

    var hashChanged = function() {
        GM_log("hashChanged");
        var url = "" + window.location;
        if (muteIntervalHandle) {
            clearInterval(muteIntervalHandle);
        }

        if (url.indexOf(dashboardUrl) > 0) {
            muteRowsAtInterval();
        }
        else if (url.match(/\#\/c\/(\d+)\//)) { // looking at a single patch
            addMuteButton(RegExp.$1);
        }
        else {
            // no-op
            GM_log("no-op");
        }
    };

    window.onhashchange = function() {
        hashChanged();
    };

    // init datastore for this userscript - a simple array stored as a CSV string
    if (!GM_getValue(mutedListKey)) {
        GM_setValue(mutedListKey, "");
    }

    muteRowsAtInterval();

})();
