/* 
This file includes the code for:

Setting up the service worker
Keybinds
Setting assignment width on resize
Ajax error function
Other minor utilities
*/

// Prevents submitting form on refresh
// cite 
// https://stackoverflow.com/questions/6320113/how-to-prevent-form-resubmission-when-page-is-refreshed-f5-ctrlr
if ( window.history.replaceState ) {
    window.history.replaceState( null, null, window.location.href );
}
// Load in assignment data
dat = JSON.parse(document.getElementById("load-data").textContent);
[warning_acceptance, def_min_work_time, def_skew_ratio, def_nwd, def_funct_round_minute, ignore_ends, show_progress_bar, show_past, color_priority, text_priority] = dat[0];
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
    $("#re-enable-tutorial, #delete-assignments").click(function() {
        alert("This feature has not yet been implented");
    }).css("text-decoration","line-through");
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
            alert(response.responseText);
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
            document.write(response.responseText);
        }
    }
    // cite
    // https://stackoverflow.com/questions/58019463/how-to-detect-device-name-in-safari-on-ios-13-while-it-doesnt-show-the-correct
    isMobile = /iPad|iPhone|iPod/.test(navigator.platform) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (isMobile) {
        $("#form-wrapper #bottom-note").hide();
    }
    // cite
    // https://web.dev/customize-install/
    let prompt;
    window.addEventListener('beforeinstallprompt', function(e) {
        // Prevent the mini-infobar from appearing on mobile
        e.preventDefault();
        // Stash the event so it can be triggered later.
        prompt = e;
    });
    if (window.matchMedia('(display-mode: standalone)').matches) {
        $("#nav-items span").hide();
    } else {
        $("#nav-items span").click(function() {
            if (prompt) {
                // Show the install prompt
                prompt.prompt();
                // Wait for the user to respond to the prompt
                prompt.userChoice.then(choiceResult => {
                    if (choiceResult.outcome === 'accepted') {
                        alert("Thanks for installing the app");
                    }
                });
            } else {
                if (isMobile) {
                    alert('Click the share icon on your screen (up arrow in a square) and scroll to "Add to Home Screen"\n\nPlease use the Safari browser if this is not an option');
                } else {
                    alert("Progressive web apps are not supported on your web browser, please use Google Chrome or Microsoft Edge\n\nIgnore this if you already have this installed");
                }
            }
        });
    }
    // Saves current open assignments to localstorage if refreshed or redirected
    // lighthouse says to use onpagehide instead of unload
    $(window).on('onpagehide' in self ? 'pagehide' : 'unload', function() {
        // Save current open assignments
        sessionStorage.setItem("open_assignments", JSON.stringify(
            $(".assignment.disable-hover").map(function() {
                return $("#assignments-container").children().index($(this).parent())
            }).toArray()
        ));
        // Save scroll position
        localStorage.setItem("scroll", $("main").scrollTop());
    });
    // Ensure fonts load for the graph
    document.fonts.ready.then(function () {
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
});
// Lock to landscape
if (!navigator.xr && self.isMobile && screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('landscape');
}