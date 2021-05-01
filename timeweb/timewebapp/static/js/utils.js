/* 
This file includes the code for:

Loading in load data
Advanced options
Ajax error function
Other minor utilities

This only runs on index.html
*/
gtag("event", "home");
// Prevents submitting form on refresh
// cite 
// https://stackoverflow.com/questions/6320113/how-to-prevent-form-resubmission-when-page-is-refreshed-f5-ctrlr
if ( window.history.replaceState ) {
    window.history.replaceState( null, null, window.location.href );
}
// Load in assignment data
dat = JSON.parse(document.getElementById("assignment-models").textContent);
({warning_acceptance, def_min_work_time, def_skew_ratio, def_nwd, def_funct_round_minute, ignore_ends, show_progress_bar, show_info_buttons, show_past, color_priority, text_priority, first_login} = JSON.parse(document.getElementById("settings-model").textContent));
def_nwd = def_nwd.map(Number);
for (let selected_assignment of dat) {
    selected_assignment.works = selected_assignment.works.map(Number);
}
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
// Use DOMContentLoaded because $(function() { fires too slowly on the initial animation for some reason
document.addEventListener("DOMContentLoaded", function() {
    // Define csrf token provided by backend
    csrf_token = $("form input:first-of-type").val();
    // Hide and show estimated completion time
    $("#hide-button").click(function() {
        if ($(this).html() === "Hide") {
            $(this).html("Show").prev().toggle();
            localStorage.setItem("hide-button", true);
        } else {
            $(this).html("Hide").prev().toggle();
            localStorage.removeItem("hide-button");
        }
    });
    if ("hide-button" in localStorage) {
        $("#hide-button").html("Show").prev().toggle();
    }
    $("#open-assignments").click(() => $(".assignment:not(.disable-hover)").click());
    $("#close-assignments").click(() => $(".assignment.disable-hover").click());
    $("#re-enable-tutorial").click(function() {
        sessionStorage.setItem("first_login", true);
        sessionStorage.removeItem("open_assignments");
        location.reload();
    });
    $("#delete-assignments").click(function() {
        if (confirm(`This will delete ${$(".finished").length} finished assignments. Are you sure you want to delete these?`)) {
            const finished_assignments = $(".assignment-container").map(function(index) {
                if ($(this).hasClass("finished")) {
                    return dat[index].id
                } else {
                    return undefined
                }
            }).toArray();
            let data = {
                'csrfmiddlewaretoken': csrf_token,
                'action': 'delete_assignment',
                'assignments': finished_assignments,
            }
            const success = function() {
                $(".finished").remove();
                for (let i = 0; i < finished_assignments.length; i++) {
                    gtag("event","delete_assignment");
                }
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
        console.log("hi");
        sort({autofill_override: true});
        $(window).trigger("resize");
    }).info("left",
    `This only applies to every assignment you have not entered past work inputs for

    Assumes you completed nothing for every missing work input and autofills in no work done until today`,"prepend").css("left",-2);
    // Keybind
    form_is_showing = false;
    $(document).keydown(function(e) {
        if (!form_is_showing && e.shiftKey /* shiftKey eeded if the user presses caps lock */ && e.key === 'N') {
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
    // Ajax error function
    error = function(response, exception) {
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
    let ajaxTimeout,
        data = {
            'csrfmiddlewaretoken': csrf_token,
            'action': 'save_assignment',
            'assignments': [],
        };

    SendAttributeAjax = function(key, value, pk) {
        // Add key and value the data going to be sent
        // This way, if this function is called multiple times for different keys and values, they are all sent in one ajax rather than many smaller ones
        let selected_assignment;
        for (let assignment of data['assignments']) {
            if (assignment.pk === pk) {
                selected_assignment = assignment;
            }
        }
        if (!selected_assignment) {
            selected_assignment = {pk: pk};
            data['assignments'].push(selected_assignment);
        }
        selected_assignment[key] = value;
        clearTimeout(ajaxTimeout);
        ajaxTimeout = setTimeout(function() {
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
        }, 1000);
    }
    // Saves current open assignments to localstorage if refreshed or redirected
    // lighthouse says to use onpagehide instead of unload
    $(window).on('onpagehide' in self ? 'pagehide' : 'unload', function() {
        if (!("first_login" in sessionStorage)) {
            // Save current open assignments
            sessionStorage.setItem("open_assignments", JSON.stringify(
                $(".assignment.disable-hover").map(function() {
                    return $(".assignment-container").index($(this).parent())
                }).toArray()
            ));
        }
        // Save scroll position
        localStorage.setItem("scroll", $("main").scrollTop());
    });
    // Ensure fonts load for the graph
    document.fonts.ready.then(function() {
        // Reopen closed assignments
        if ("open_assignments" in sessionStorage) {
            JSON.parse(sessionStorage.getItem("open_assignments")).forEach(index => 
                // Pretends created assignment isn't there to preserve index
                $(".assignment-container").filter(function() { 
                    return !$(this).is("#animate-in")
                }).eq(index).children().first().click()
            );
        }
        // Scroll to original position
        // Needs to be here so it scrolls after assignments are opened
        if ("scroll" in localStorage) {
            $("main").scrollTop(localStorage.getItem("scroll"));
            localStorage.removeItem("scroll");
        }
    });
    // First login tutorial
    if (first_login) {
        sessionStorage.setItem("first_login", true);
    }
    if ("first_login" in sessionStorage) {
        if ($(".assignment-container").length) {
            $(".assignment-container").first().append("<span>Click your assignment<br></span>")
        } else {
            $("#assignments-header").replaceWith("<span>Welcome to TimeWeb Beta! Thank you for your interest in using this tool.<br><br>Create your first school or work assignment to get started");
        }
    }
});

// Lock to landscape
if (!navigator.xr && self.isMobile && screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('landscape');
}
