/* 
This file includes the code for:

Loading in load data
Advanced options
Keybinds
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
dat = JSON.parse(document.getElementById("load-data").textContent);
[warning_acceptance, def_min_work_time, def_skew_ratio, def_nwd, def_funct_round_minute, ignore_ends, show_progress_bar, show_info_buttons, show_past, color_priority, text_priority, first_login] = dat[0];
def_nwd = def_nwd.map(Number);
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
        alert("This feature has not yet been implented");
    }).css("text-decoration","line-through");
    $("#autofill-assignments")//.info('left',`Autofills no work done for every assignment with incomplete past work inputs until today`);
    // Keybinds
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
    // Saves current open assignments to localstorage if refreshed or redirected
    // lighthouse says to use onpagehide instead of unload
    $(window).on('onpagehide' in self ? 'pagehide' : 'unload', function() {
        if (!("first_login" in sessionStorage)) {
            // Save current open assignments
            sessionStorage.setItem("open_assignments", JSON.stringify(
                $(".assignment.disable-hover").map(function() {
                    return $("#assignments-container").children().index($(this).parent())
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
                $("#assignments-container").children().filter(function() { 
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
    // Makes input bigger for info button
    if (show_info_buttons || "first_login" in sessionStorage) {
        $(".total-work-input-button").css("width", 163);
        // Position up/down input scroller
        $(".skew-ratio-textbox").addClass("translate-left");
    }
});
// Lock to landscape
if (!navigator.xr && self.isMobile && screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('landscape');
}