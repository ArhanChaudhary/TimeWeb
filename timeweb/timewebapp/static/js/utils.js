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
if (!window.gtag) {
    function gtag() {};
}
gtag("event", "home");
// Prevents submitting form on refresh
// cite 
// https://stackoverflow.com/questions/6320113/how-to-prevent-form-resubmission-when-page-is-refreshed-f5-ctrlr
if ( window.history.replaceState ) {
    window.history.replaceState( null, null, window.location.href );
}
// Load in assignment data
dat = JSON.parse(document.getElementById("assignment-models").textContent);
({ warning_acceptance, def_min_work_time, def_skew_ratio, def_nwd, def_funct_round_minute, ignore_ends, show_progress_bar, show_info_buttons, show_past, color_priority, text_priority, first_login, date_now } = JSON.parse(document.getElementById("settings-model").textContent));
def_nwd = def_nwd.map(Number);
for (let sa of dat) {
    sa.works = sa.works.map(Number);
}
date_now = new Date(date_now + " 00:00");
// cite
// https://stackoverflow.com/questions/6427204/date-parsing-in-javascript-is-different-between-safari-and-chrome
// Date.parse but compatible with safari
function parseDate(date) {
    const parsed = Date.parse(date);
    if (!isNaN(parsed)) {
        return parsed;
    }
    return Date.parse(date.replace(/-/g, '/').replace(/[a-z]+/gi, ' '));
}
function load_assignment_data($assignment) {
    return dat.find(assignment => assignment.assignment_name === $assignment.attr("data-assignment-name"));
}
// Make these global because other files use scroll()
let scrollTimeout;
function scroll(resolver) {
    clearTimeout(scrollTimeout);
    // Runs when scroll ends
    scrollTimeout = setTimeout(function() {
        $("main").off('scroll');
        resolver();
    }, 200);
}
function displayClock() {
    let estimated_completion_time = new Date();
    estimated_completion_time.setMinutes(estimated_completion_time.getMinutes() + +$("#estimated-total-time").attr("data-minutes"));
    $("#current-time").html(` (${estimated_completion_time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`);
}

const HOUR_TO_UPDATE = 4;
function changeDateNow() {
    if (date_now.valueOf() + 86400000 + 1000*60*60*HOUR_TO_UPDATE < new Date().valueOf()) {
        date_now.setDate(date_now.getDate() + 1);
        const data = {
            'csrfmiddlewaretoken': csrf_token,
            'action': 'update_date_now',
            'date_now': stringifyDate(date_now),
        }
        $.ajax({
            type: "POST",
            data: data,
            error: error,
        });
        for (let sa of dat) {
            sa.hidden = false;
        }
    }
}
// AJAX error function
function error(response, exception) {
    if (response.status == 0) {
        alert('Failed to connect');
    } else if (response.status == 403) {
        $("html").html(response.responseText);
    } else if (response.status == 404) {
        alert('Not found, try again');
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
}
function send_tutorial_ajax() {
    const data = {
        'csrfmiddlewaretoken': csrf_token,
        'action': 'change_first_login',
        'first_login': first_login,
    }
    $.ajax({
        type: "POST",
        data: data,
        error: error,
    });
}
function stringifyDate(date) {
    return [
        date.getFullYear(),
        ('0' + (date.getMonth() + 1)).slice(-2),
        ('0' + date.getDate()).slice(-2),
    ].join('-');
}
// Use DOMContentLoaded because $(function() { fires too slowly on the initial animation for some reason
document.addEventListener("DOMContentLoaded", function() {
    // Define csrf token provided by backend
    csrf_token = $("form input:first-of-type").val();
    changeDateNow();
    setInterval(changeDateNow, 1000*60);
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
    $("#open-assignments").click(() => $(".assignment:not(.open-assignment)").click());
    $("#close-assignments").click(() => $(".assignment.open-assignment").click());
    $("#re-enable-tutorial").click(function() {
        if (!first_login) {
            first_login = true;
            sessionStorage.removeItem("open_assignments");
            send_tutorial_ajax();

            $("#close-assignments").click();
            if ($(".assignment-container").length) {
                $(".assignment-container").first().append("<span>Click your assignment<br></span>");
            } else {
                $("#assignments-header").replaceWith("<span>Welcome to TimeWeb Beta! Thank you for your interest in using this app.<br><br>Create your first school or work assignment to get started</span>");
            }
        }
    });
    $("#delete-assignments").click(function() {
        if (isMobile ? confirm(`This will delete ${$(".finished").length} finished assignments. Are you sure?`) : confirm(`This will delete ${$(".finished").length} finished assignments. Are you sure? (Press enter)`)) {
            const finished_assignments = $(".assignment-container").map(function() {
                if ($(this).hasClass("finished")) {
                    return load_assignment_data($(this).children().first()).id;
                } else {
                    return undefined;
                }
            }).toArray();
            let data = {
                'csrfmiddlewaretoken': csrf_token,
                'action': 'delete_assignment',
                'assignments': JSON.stringify(finished_assignments),
            }
            const success = function() {
                $(".finished").remove();
                for (let i = 0; i < finished_assignments.length; i++) {
                    gtag("event","delete_assignment");
                }
                sort({ ignore_timeout: true });
            }
            // Send ajax to avoid a page reload
            $.ajax({
                type: "POST",
                data: data,
                success: success,
                error: error,
            });
        }
    });
    $("#autofill-assignments").click(function() {
        if (confirm("This will autofill no work done until today for every assignment with missing work inputs. Are you sure?")) {
            sort({autofill_override: true, ignore_timeout: true});
        }
    }).info("left",
        `This applies to every assignment you have not entered past work inputs for

        Assumes you completed nothing for every missing work input and autofills in no work done until today`,"prepend"
    ).css("left", -2).addClass("dont-hide-button");
    // Keybind
    form_is_showing = false;
    $(document).keydown(function(e) {
        if (!form_is_showing && e.shiftKey /* shiftKey needed if the user presses caps lock */ && e.key === 'N') {
            $("#image-new-container").click();
            return false;
        } else if (e.key === "Escape") {
            hideForm();
        }
    });
    // width * percent = width+10
    // percent = 1 + 10/width
    $(window).resize(function() {
        $("#assignments-container")[0].style.setProperty('--scale-percent',`${1 + 10/$(document.querySelector(".assignment")).width()}`);
    });
    $("#assignments-container")[0].style.setProperty('--scale-percent',`${1 + 10/$(document.querySelector(".assignment")).width()}`);
    let ajaxTimeout,
        data = {
            'csrfmiddlewaretoken': csrf_token,
            'action': 'save_assignment',
            'assignments': [],
        };
    SendAttributeAjax = function(key, value, pk) {
        // Add key and values as the data being sent
        // This way, if this function is called multiple times for different keys and values, they are all sent in one ajax rather than many smaller ones
        let sa;
        for (let assignment of data['assignments']) {
            if (assignment.pk === pk) {
                sa = assignment;
            }
        }
        if (!sa) {
            sa = {pk: pk};
            data['assignments'].push(sa);
        }
        sa[key] = value;
        clearTimeout(ajaxTimeout);
        ajaxTimeout = setTimeout(sendAjaxNoTimeout, 1000);
    }
    function sendAjaxNoTimeout() {
        const success = function() {
            gtag("event","save_assignment");
        }
        // Send data along with the assignment's primary key

        // It is possible for users to send data that won't make any difference, for example they can quickly click fixed_mode twice, yet the ajax will still send
        // However, I decided to skip this check and still send the ajax
        // Coding in a check to only send an ajax when the data has changed is tedious, as I have to store the past values of every button to check with the current value
        // Plus, a pointless ajax of this sort won't happen frequently, and will have a minimal impact on the server's performance
        data['assignments'] = JSON.stringify(data['assignments']);
        $.ajax({
            type: "POST",
            data: data,
            success: success,
            error: error,
        });
        // Reset data
        data = {
            'csrfmiddlewaretoken': csrf_token,
            'action': 'save_assignment',
            'assignments': [],
        }
    }
    // Saves current open assignments to localstorage if refreshed or redirected
    // lighthouse says to use onpagehide instead of unload
    $(window).on('onpagehide' in self ? 'pagehide' : 'unload', function() {
        if (!first_login) {
            // Save current open assignments
            sessionStorage.setItem("open_assignments", JSON.stringify(
                $(".assignment.open-assignment").map(function() {
                    return $(this).find(".title").text()
                }).toArray()
            ));
        }
        // Save scroll position
        localStorage.setItem("scroll", $("main").scrollTop());
        if (data['assignments'].length) {
            sendAjaxNoTimeout();
        }
    });
    // Ensure fonts load for the graph
    document.fonts.ready.then(function() {
        // Reopen closed assignments
        if ("open_assignments" in sessionStorage) {
            const open_assignments = JSON.parse(sessionStorage.getItem("open_assignments"));
            $(".title").filter(function() {
                return open_assignments.includes($(this).text())
            }).parents(".assignment").click();
        }
        // Scroll to original position
        // Needs to be here so it scrolls after assignments are opened
        if ("scroll" in localStorage) {
            $("main").scrollTop(localStorage.getItem("scroll"));
            localStorage.removeItem("scroll");
        }
    });
    if (first_login) {
        if ($(".assignment-container").length) {
            $(".assignment-container").first().append("<span>Click your assignment<br></span>");
        } else {
            $("#assignments-header").replaceWith("<span>Welcome to TimeWeb Beta! Thank you for your interest in using this app.<br><br>Create your first school or work assignment to get started</span>");
        }
    }
});
function format_minutes(total_minutes) {
    const hour = Math.floor(total_minutes / 60),
        minute = Math.ceil(total_minutes % 60);
    if (hour === 0) {
        return (total_minutes && total_minutes < 1) ? "<1m" : minute + "m";
    } else if (minute === 0) {
        return hour + "h";
    } else {
        return hour + "h " + minute + "m";
    }
}
// Lock to landscape
if (!navigator.xr && self.isMobile && screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('landscape');
}
