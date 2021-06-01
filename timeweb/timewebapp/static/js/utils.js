/* 
This file includes the code for:

Preventing submitting form on refresh
Parsing date on safari
Resolving a promise passed to a scroll function that determines when a scroll ends
Hide button
Advanced options
Sending attribute AJAX
Preserving page state before refresh
Setting up the tutorial
Other minor utilities

This only runs on index.html
*/
gtag("event", "home");
utils = {
    formatting: {
        // cite
        // https://stackoverflow.com/questions/6427204/date-parsing-in-javascript-is-different-between-safari-and-chrome
        // Converts YYYY-MM-DD to Date objects reliably on safari
        // This also adds "T00:00" to the end of the inputted date string before parsing
        parseDate: function(date) {
            date += "T00:00";
            const parsed = Date.parse(date);
            if (!isNaN(parsed)) {
                return parsed;
            }
            return Date.parse(date.replace(/-/g, '/').replace(/[a-z]+/gi, ' '));
        },
        // Converts Date objects to YYYY-MM-DD
        stringifyDate: function(date) {
            return [
                date.getFullYear(),
                ('0' + (date.getMonth() + 1)).slice(-2),
                ('0' + date.getDate()).slice(-2),
            ].join('-');
        },
        formatMinutes: function(total_minutes) {
            const hour = Math.floor(total_minutes / 60),
                minute = Math.ceil(total_minutes % 60);
            if (!hour) return (total_minutes && total_minutes < 1) ? "<1m" : minute + "m";
            if (!minute) return hour + "h";
            return hour + "h " + minute + "m";
        },
        // cite
        // https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
        hexToRgb: function(hex) {
            var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16)
            } : null;
        }
          
    },
    ui: {
        displayClock: function() {
            const estimated_completion_time = new Date();
            const minute_value = estimated_completion_time.getMinutes();
            if (minute_value !== utils.ui.old_minute_value) {
                estimated_completion_time.setMinutes(minute_value + +$("#estimated-total-time").attr("data-minutes"));
                if (isNaN(estimated_completion_time.getMinutes())) {
                    estimated_completion_time.setTime(8640000000000000);
                }
                $("#current-time").html(` (${estimated_completion_time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`);
                utils.ui.old_minute_value = minute_value;
            }
        },
        setHideEstimatedCompletionTimeButton: function() {
            // Hide and show estimated completion time
            $("#hide-button").click(function() {
                if ($(this).html() === "Hide") {
                    $(this).html("Show");
                    localStorage.setItem("hide-button", true);
                } else {
                    $(this).html("Hide");
                    localStorage.removeItem("hide-button");
                }
                $("#estimated-total-time, #current-time, #tomorrow-time").toggle();
            });
            if ("hide-button" in localStorage) {
                $("#hide-button").html("Show").prev().toggle();
            }
        },
        setAdvancedClickHandlers: function() {
            // Advanced inputs for the graph
            $(".advanced-buttons").click(function() {
                $(".skew-ratio-button, .skew-ratio-textbox, .skew-ratio-textbox + .info-button, .fixed-mode-button").toggle();
                $(".advanced-buttons").toggle();
            });
            $(".second-advanced-button").toggle();
            $(".skew-ratio-button, .skew-ratio-textbox, .fixed-mode-button").toggle(); // .skew-ratio-textbox + .info-button is hidden in graph.js
            // Advanced inputs for form
            $("#id_funct_round, #id_min_work_time, #break-days-label-title").parent().addClass("hidden");
            $("#break-days-wrapper").addClass("hidden");
            $("#form-wrapper #advanced-inputs").insertBefore($("#form-wrapper .hidden").first()).click(function() {
                $("#id_funct_round, #id_min_work_time, #break-days-label-title").parent().toggleClass("hidden");
                $("#break-days-wrapper").toggleClass("hidden");
            })
            if ("advanced_inputs" in sessionStorage) {
                $("#form-wrapper #advanced-inputs").click();
                sessionStorage.removeItem("advanced_inputs");
            }
            // Advanced inputs in home
            $("#advanced").click(function(e) {
                // Ignore propagation
                if (e.target === this) {
                    $("#advanced-options").toggleClass("hidden");
                }
            });
    
            $("#open-assignments").click(() => $(".assignment:not(.open-assignment)").click());
    
            $("#close-assignments").click(() => $(".assignment.open-assignment").click());
    
            $("#simulated-date").hide();
            $("#next-day").click(function() {
                ajaxUtils.disable_ajax = true;
                date_now.setDate(date_now.getDate() + 1);
                $("#simulated-date").show().text("Simulated date: " + date_now.toLocaleDateString("en-US", {month: 'long', day: 'numeric', weekday: 'long'}))
                $(window).trigger("resize");
                priority.sort({ ignore_timeout: true });
            }).info("left",
                `Simulates the next day for ALL assignments
                
                All changes made in the simulation are NOT saved, except for adding or modifying assignments. Your assignments can be restored by refreshing this page`, 'prepend'
            ).css("left", -3);

            $("#re-enable-tutorial").click(function() {
                if (!first_login) {
                    first_login = true;
                    sessionStorage.removeItem("open_assignments");
                    ajaxUtils.sendTutorialAjax();
    
                    $("#close-assignments").click();
                    if ($(".assignment-container").length) {
                        $(".assignment-container").first().append("<span>Click your assignment<br></span>");
                    } else {
                        $("#assignments-header").replaceWith("<span>Welcome to TimeWeb Beta! Thank you for your interest in using this app.<br><br>Create your first school or work assignment to get started</span>");
                    }
                }
            });
        },
        setKeybinds: function() {
            // Keybind
            utils.form_is_showing = false;
            $(document).keydown(function(e) {
                if (!utils.form_is_showing && e.shiftKey /* shiftKey needed if the user presses caps lock */ && e.key === 'N') {
                    $("#image-new-container").click();
                    return false;
                } else if (e.key === "Escape") {
                    hideForm();
                }
            });
        },
        setAssignmentHoverScale: function() {
            // width * percent = width+10
            // percent = 1 + 10/width
            $("#assignments-container")[0].style.setProperty('--scale-percent',`${1 + 10/$(".assignment").first().width()}`);
        },
        handleTutorialIntroduction: function() {
            if (first_login) {
                const assignments_excluding_example = $(".assignment").filter(function() {
                    return $(this).attr("data-assignment-name") !== example_assignment_name;
                });
                if (assignments_excluding_example.length) {
                    assignments_excluding_example.parent().append("<span>Click your assignment<br></span>");
                } else {
                    $("#assignments-header").replaceWith("<span>Welcome to TimeWeb Beta! Thank you for your interest in using this app.<br><br>Create your first school or work assignment to get started</span>");
                    // Hide .assignment because DOMswap has removeAttr("style")
                    $(".assignment").hide();
                }
            }
        },
        saveStatesOnClose: function() {
            // Saves current open assignments and scroll position to localstorage and sessionstorage if refreshed or redirected
            $(window).on('onpagehide' in self ? 'pagehide' : 'unload', function() { // lighthouse says to use onpagehide instead of unload
                if (!first_login) {
                    // Save current open assignments
                    sessionStorage.setItem("open_assignments", JSON.stringify(
                        $(".assignment.open-assignment").map(function() {
                            return $(this).attr("data-assignment-name")
                        }).toArray()
                    ));
                }
                // Save scroll position
                localStorage.setItem("scroll", $("main").scrollTop());
                if (!$("#form-wrapper .hidden").length) {
                    sessionStorage.setItem("advanced_inputs", true);
                }
                // Bypass ajax timeout
                if (ajaxUtils.data['assignments'].length) {
                    ajaxUtils.SendAttributeAjax();
                }
            });
            // Ensure fonts load for the graph
            document.fonts.ready.then(function() {
                // Reopen closed assignments
                if ("open_assignments" in sessionStorage) {
                    const open_assignments = JSON.parse(sessionStorage.getItem("open_assignments"));
                    $(".assignment").filter(function() {
                        return open_assignments.includes($(this).attr("data-assignment-name"))
                    }).click();
                }
                // Scroll to original position
                // Needs to be here so it scrolls after assignments are opened
                if ("scroll" in localStorage) {
                    $("main").scrollTop(localStorage.getItem("scroll"));
                    localStorage.removeItem("scroll");
                }
            });
        },
    },
    daysBetweenTwoDates: function(larger_date, smaller_date) {
        return Math.round((larger_date - smaller_date) / 86400000); // Round for DST
    },
    loadAssignmentData: function($assignment) {
        return dat.find(assignment => assignment.assignment_name === $assignment.attr("data-assignment-name"));
    },
    // Resolves a resolver promise function when automatic scrolling ends
    scroll: function(resolver) {
        clearTimeout(utils.scrollTimeout);
        // Runs when scroll ends
        utils.scrollTimeout = setTimeout(function() {
            $("main").off('scroll');
            resolver();
        }, 200);
    },
}

isExampleAccount = username === example_account_name;
ajaxUtils = {
    disable_ajax: isExampleAccount, // Even though there is a server side validation for disabling ajax on the example account, initally disable it locally to ensure things don't also get changed locally
    hour_to_update: hour_to_update,
    error: function(response, exception) {
        if (response.status == 0) {
            alert('Failed to connect');
        } else if (response.status == 403) {
            $("html").html(response.responseText);
        } else if (response.status == 404) {
            alert('Not found, try refreshing');
        } else if (response.status == 500) {
            alert('Internal server error. Please contact me if you see this');
        } else if (exception === 'parsererror') {
            alert('JSON parse failed');
        } else if (exception === 'timeout') {
            alert('Timed out, try again');
        } else if (exception === 'abort') {
            alert('Request aborted, try again');
        } else {
            $("html").html(response.responseText);
        }
    },
    changeDateNowAndExampleAssignmentDates: function() {
        if (!ajaxUtils.disable_ajax && date_now.valueOf() + 1000*60*60*(24 + ajaxUtils.hour_to_update) < new Date().valueOf()) {
            date_now = new Date(new Date().toDateString());
            // If this runs after midnight, set date_now to yesterday
            if (new Date().getHours() < ajaxUtils.hour_to_update) {
                date_now = date_now.setDate(date_now.getDate() - 1);
            }

            const data = {
                'csrfmiddlewaretoken': csrf_token,
                'action': 'update_date_now',
                'date_now': utils.formatting.stringifyDate(date_now),
            }
            const example_assignment = dat.find(sa_iter => sa_iter.assignment_name === example_assignment_name);
            if (example_assignment === undefined) {
                data["days_since_example_ad"] = 0;
            } else {
                const days_since_example_ad = utils.daysBetweenTwoDates(date_now, utils.formatting.parseDate(example_assignment.ad));
                data["days_since_example_ad"] = days_since_example_ad;
                const ad = new Date(utils.formatting.parseDate(example_assignment.ad));
                ad.setDate(ad.getDate() + days_since_example_ad);
                example_assignment.ad = utils.formatting.stringifyDate(ad);
                const x = new Date(utils.formatting.parseDate(example_assignment.x));
                x.setDate(x.getDate() + days_since_example_ad);
                example_assignment.x = utils.formatting.stringifyDate(x);
            }
            $.ajax({
                type: "POST",
                data: data,
                error: ajaxUtils.error,
            });
            // Unmark all assignments as finished
            for (let sa of dat) {
                sa.mark_as_done = false;
            }
        }
    },
    sendTutorialAjax: function() {
        if (ajaxUtils.disable_ajax) return;
        const data = {
            'csrfmiddlewaretoken': csrf_token,
            'action': 'change_first_login',
            'first_login': first_login,
        }
        $.ajax({
            type: "POST",
            data: data,
            error: ajaxUtils.error,
        });
    },
    SendAttributeAjaxWithTimeout: function(key, value, pk) {
        if (ajaxUtils.disable_ajax) return;
        // Add key and values as the data being sent
        // This way, if this function is called multiple times for different keys and values, they are all sent in one ajax rather than many smaller ones
        let sa;
        for (let iter_sa of ajaxUtils.data['assignments']) {
            if (iter_sa.pk === pk) {
                sa = iter_sa;
            }
        }
        if (!sa) {
            sa = {pk: pk};
            ajaxUtils.data['assignments'].push(sa);
        }
        sa[key] = value;
        clearTimeout(ajaxUtils.ajaxTimeout);
        ajaxUtils.ajaxTimeout = setTimeout(ajaxUtils.SendAttributeAjax, 1000);
    },
    SendAttributeAjax: function() {
        const success = function() {
            gtag("event","save_assignment");
        }
        // Send data along with the assignment's primary key

        // It is possible for users to send data that won't make any difference, for example they can quickly click fixed_mode twice, yet the ajax will still send
        // Coding in a check to only send an ajax when the data has changed is tedious, as I have to store the past values of every button to check with the current value
        // Plus, a pointless ajax of this sort won't happen frequently and will have a minimal impact on the server's performance
        ajaxUtils.data['assignments'] = JSON.stringify(ajaxUtils.data['assignments']);
        $.ajax({
            type: "POST",
            data: ajaxUtils.data,
            success: success,
            error: ajaxUtils.error,
        });
        // Reset data
        ajaxUtils.data = {
            'csrfmiddlewaretoken': csrf_token,
            'action': 'save_assignment',
            'assignments': [],
        }
    },
}


// Prevents submitting form on refresh
// cite 
// https://stackoverflow.com/questions/6320113/how-to-prevent-form-resubmission-when-page-is-refreshed-f5-ctrlr
if ( window.history.replaceState ) {
    window.history.replaceState( null, null, window.location.href );
}
// Load in assignment data
dat = JSON.parse(document.getElementById("assignment-models").textContent);
for (let sa of dat) {
    sa.works = sa.works.map(Number);
    sa.break_days = sa.break_days.map(Number);
}
({ warning_acceptance, def_min_work_time, def_skew_ratio, def_break_days, def_unit_to_minute, def_funct_round_minute, ignore_ends, show_progress_bar, color_priority, text_priority, first_login, date_now, highest_priority_color, lowest_priority_color } = JSON.parse(document.getElementById("settings-model").textContent));
def_break_days = def_break_days.map(Number);
date_now = new Date(utils.formatting.parseDate(date_now));
highest_priority_color = utils.formatting.hexToRgb(highest_priority_color)
lowest_priority_color = utils.formatting.hexToRgb(lowest_priority_color)
// Use DOMContentLoaded because $(function() { fires too slowly on the initial animation for some reason
document.addEventListener("DOMContentLoaded", function() {
    // Define csrf token provided by backend
    csrf_token = $("form input:first-of-type").val();
    // Initial ajax data for SendAttributeAjax
    ajaxUtils.data = {
        'csrfmiddlewaretoken': csrf_token,
        'action': 'save_assignment',
        'assignments': [],
    },
    ajaxUtils.changeDateNowAndExampleAssignmentDates();
    setInterval(ajaxUtils.changeDateNowAndExampleAssignmentDates, 1000*60);
    utils.ui.setHideEstimatedCompletionTimeButton();
    utils.ui.setAdvancedClickHandlers();
    ordering.deleteStarredAssignmentsListener();
    ordering.autofillAssignmentsListener();
    utils.ui.setKeybinds();
    $(window).resize(utils.ui.setAssignmentHoverScale);
    utils.ui.setAssignmentHoverScale();
    utils.ui.saveStatesOnClose();
    utils.ui.handleTutorialIntroduction();
});
// Lock to landscape
if (!navigator.xr && self.isMobile && screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('landscape');
}
