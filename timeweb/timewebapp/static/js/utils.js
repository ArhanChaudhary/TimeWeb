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
        // Reverses stringifyDate
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
        // Reverses parseDate
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
            return {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16),
            }
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
    
            $("#open-assignments").click(function() {
                if ($(".incomplete-works").length) {
                    $(".assignment-container.incomplete-works .assignment:not(.open-assignment)").click();
                } else {
                    $(".assignment:not(.open-assignment)").click();
                }
            });
    
            $("#close-assignments").click(function() {
                if ($(".incomplete-works").length) {
                    $(".assignment-container.incomplete-works .assignment.open-assignment").click();
                } else {
                    $(".assignment.open-assignment").click();
                }
            });
    
            $("#simulated-date").hide();
            $("#next-day").click(function() {
                ajaxUtils.disable_ajax = true;
                date_now.setDate(date_now.getDate() + 1);
                $("#simulated-date").show().text("Simulated date: " + date_now.toLocaleDateString("en-US", {month: 'long', day: 'numeric', weekday: 'long'}))
                $(window).trigger("resize");
                priority.sort({ ignore_timeout: true });
            })
            $("#next-day-icon-label").info("bottom",
                `Simulates the next day for ALL assignments
                
                All changes made in the simulation are NOT saved, except for adding or modifying assignments. Your assignments can be restored by refreshing this page`
            );
        },
        addTagHandlers: function() {
            const tag_add_selection_item_template = $("#tag-add-selection-item-template").html();
            const tag_template = $("#tag-template").html();
            $(".tag-add").click(tagAddClick);
            function tagAddClick(e) {
                const $this = $(this);
                // Close add tag box if "Add Tag" is clicked again
                if ($(e.target).parent().hasClass("tag-add") && $this.hasClass("open-tag-add-box")) {
                    $this.removeClass("open-tag-add-box");
                    const tag_add_box = $this.find(".tag-add-box");
                    tag_add_box.css({
                        height: "unset",
                        overflow: "visible",
                    });
                    tag_add_box.one("transitionend", function() {
                        tag_add_box.css({
                            height: "",
                            overflow: "",
                        });
                    });
                    return;
                }
                // Plus button was clicked
                if ($(e.target).is(".tag-add-button, .tag-add-plus")) {
                    const sa = utils.loadAssignmentData($this);
                    let tag_names = $this.find(".tag-add-selection-item.checked .tag-add-selection-item-name").map(function() {
                        return $(this).text();
                    }).toArray();
                    const inputted_tag_name = $this.find(".tag-add-input").val().trim();
                    if (inputted_tag_name && inputted_tag_name !== "Too Many Tags!") {
                        tag_names.push(inputted_tag_name);
                    }
                    if (!tag_names.length) return;
                    tag_names = tag_names.filter(tag_name => !sa.tags.includes(tag_name));
                    if (sa.tags.length + tag_names.length > max_number_tags) {
                        $(this).find(".tag-add-button").addClass("tag-add-red-box-shadow");
                        $(this).find(".tag-add-input").val("Too Many Tags!");
                        return;
                    }
                    const success = function() {
                        // Add tags to dat locally
                        sa.tags.push(...tag_names);
                        // Close box and add tags visually
                        $this.removeClass("open-tag-add-box");
                        for (let tag_name of tag_names) {
                            const tag = $(tag_template);
                            tag.find(".tag-name").text(tag_name);
                            tag.find(".tag-delete").click(tagDelete).attr("data-tag-deletion-name", tag_name).attr("data-assignment-name", sa.assignment_name);
                            tag.appendTo($this.parents(".tags").find(".tag-sortable-container"));

                            tag.addClass("tag-add-transition-disabler");
                            // Need to use jquery to set css for marginLeft
                            tag.css({
                                marginLeft: -tag.outerWidth(true),
                                opacity: "0",
                                transform: "scale(0.6)",
                            });
                            tag[0].offsetHeight;
                            tag.removeClass("tag-add-transition-disabler");
                            tag.css({
                                marginLeft: "",
                                opacity: "",
                                transform: "",
                            });

                            tag.prev().css("z-index", "1");
                            tag.one("transitionend", function() {
                                tag.prev().css("z-index", "");
                            });
                        }
                        if (tag_names.length) {
                            $this.parents(".tags").find(".tag-sortable-container").sortable("refresh");
                        }
                    }
                    
                    // !tag_names.length to not send an ajax if removing duplicates yield an empty tag list
                    if (ajaxUtils.disable_ajax || !tag_names.length) return success();
                    const data = {
                        csrfmiddlewaretoken: csrf_token,
                        pk: sa.id,
                        tag_names: tag_names,
                        action: "tag_add",
                    }
                    $.ajax({
                        type: "POST",
                        data: data,
                        success: success,
                        error: ajaxUtils.error,
                    });
                    return;
                }
                // Tag add textbox was selected or tags were selected
                if ($this.hasClass("open-tag-add-box")) return;
                $this.addClass("open-tag-add-box");
                $this.find(".tag-add-button").removeClass("tag-add-red-box-shadow");
                $this.find(".tag-add-input").focus().val("");
                $this.find(".tag-add-selection-item").remove();
                const container_for_tags = $this.find(".tag-add-overflow-hidden-container");
                let allTags = [];
                dat.forEach(sa => allTags.push(...sa.tags));
                for (let tag of Array.from(new Set(allTags))) {
                    const tag_add_selection_item = $(tag_add_selection_item_template);
                    tag_add_selection_item.find(".tag-add-selection-item-name").first().text(tag);
                    container_for_tags.append(tag_add_selection_item);
                    tag_add_selection_item.click(function() {
                        $(this).find(".tag-add-checkbox").prop("checked", !$(this).hasClass("checked"));
                        $(this).toggleClass("checked");
                    });
                }
            }
            $(".tag-delete").click(tagDelete);
            function tagDelete() {
                const $this = $(this);
                const tag_wrapper = $this.parents(".tag-wrapper");
                tag_wrapper.addClass("keep-delete-open");
                const sa = utils.loadAssignmentData($this);
                const data = {
                    csrfmiddlewaretoken: csrf_token,
                    pk: sa.id,
                    tag_names: [$this.attr("data-tag-deletion-name")],
                    action: "tag_delete",
                }
                const success = function() {
                    // Remove data locally from dat
                    sa.tags = sa.tags.filter(tag_name => !data.tag_names.includes(tag_name));
                    // Transition the deletion
                    // Need to use jquery to set css for marginLeft
                    tag_wrapper.css({
                        marginLeft: -tag_wrapper.outerWidth(true),
                        opacity: "0",
                        transform: "scale(0.6)",
                    });
                    tag_wrapper.prev().css("z-index", "1");
                    tag_wrapper.one("transitionend", function() {
                        tag_wrapper.prev().css("z-index", "");
                        tag_wrapper.remove();
                    });
                    $this.parents(".tags").find(".tag-add-button").removeClass("tag-add-red-box-shadow");
                }
                if (ajaxUtils.disable_ajax) return success();
                $.ajax({
                    type: "POST",
                    data: data,
                    success: success,
                    error: function() {
                        tag_wrapper.removeClass("keep-delete-open");
                        ajaxUtils.error(...arguments);
                    }
                });
            }
            $(".tag-add").focusout(function(e) {
                const $this = $(this);
                setTimeout(function() {
                    // const tag_add_text_clicked = $(e.currentTarget).is($this) && $(document.activeElement).hasClass("assignment");
                    if ($(document.activeElement).parents(".tag-add").length || $(document.activeElement).is($this)) return;
                    $this.removeClass("open-tag-add-box");
                });
            });
            $(".tag-sortable-container").sortable().on("sortstop", function() {
                const sa = utils.loadAssignmentData($(this));
                sa.tags = $(this).find(".tag-name").map(function() {
                    return $(this).text();
                }).toArray();
                ajaxUtils.SendAttributeAjaxWithTimeout("tags", sa.tags, sa.id);
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
                    hideForm()
                } else if (e.key === "ArrowDown" && e.shiftKey) {
                    // If there is an open assignment in view, select that one and 
                    const first_open_assignment = $(".assignment.open-assignment").first();
                    if (first_open_assignment.length) {
                        var assignment_to_be_opened = first_open_assignment.parents(".assignment-container").next().children(".assignment");
                        first_open_assignment[0].scrollIntoView({
                            behavior: 'smooth',
                            block: 'start',
                        });
                    } else {
                        var assignment_to_be_opened = $(".assignment").first();
                        assignment_to_be_opened[0].scrollIntoView({
                            behavior: 'smooth',
                            block: 'start',
                        });
                    }
                    first_open_assignment.click();
                    if (!assignment_to_be_opened.hasClass("open-assignment")) {
                        assignment_to_be_opened.click();
                    }
                } else if (e.key === "ArrowUp" && e.shiftKey) {
                    // If there is an open assignment in view, select that one and 
                    const last_open_assignment = $(".assignment.open-assignment").last();
                    if (last_open_assignment.length) {
                        var assignment_to_be_opened = last_open_assignment.parents(".assignment-container").prev().children(".assignment");
                        if (assignment_to_be_opened.length) {
                            assignment_to_be_opened[0].scrollIntoView({
                                behavior: 'smooth',
                                block: 'start',
                            });
                        }
                    } else {
                        var assignment_to_be_opened = $(".assignment").last();
                    }
                    last_open_assignment.click();
                    if (!assignment_to_be_opened.hasClass("open-assignment")) {
                        assignment_to_be_opened.click();
                    }
                    if (!last_open_assignment.length) {
                        assignment_to_be_opened[0].scrollIntoView({
                            behavior: 'smooth',
                            block: 'end',
                        });        
                    }
                }
            });
            $(".tag-add-input").keydown(function(e) {
                if (e.key === "Enter") {
                    // blur so it hides the tag add box
                    $(this).blur().parents(".tags").find(".tag-add-button").click();
                }
            });
        },
        setAssignmentScaleUtils: function() {
            // width * percent = width+10
            // percent = 1 + 10/width
            $(window).resize(() => $("#assignments-container")[0].style.setProperty('--scale-percent',`${1 + 10/$(".assignment").first().width()}`));
            $("#assignments-container")[0].style.setProperty('--scale-percent',`${1 + 10/$(".assignment").first().width()}`);
        },
        handleTutorialIntroduction: function() {
            if (enable_tutorial) {
                const assignments_excluding_example = $(".assignment").filter(function() {
                    return $(this).attr("data-assignment-name") !== example_assignment_name;
                });
                if (assignments_excluding_example.length) {
                    assignments_excluding_example.first().after("<span>Click your assignment<br></span>");
                } else {
                    $("#assignments-header").replaceWith('<div id="introduction-message"><div>Welcome to TimeWeb Beta! Thank you for your interest in using this app.</div><br><div>Create your first school or work assignment to get started</div></div>');
                    $(".assignment-container").hide();
                }
            }
        },
        saveStatesOnClose: function() {
            // Saves current open assignments and scroll position to localstorage and sessionstorage if refreshed or redirected
            $(window).on('onpagehide' in self ? 'pagehide' : 'unload', function() { // lighthouse says to use onpagehide instead of unload
                if (!enable_tutorial) {
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
                // Send ajax before close if it's on timeout
                if (ajaxUtils.data['assignments'].length) {
                    ajaxUtils.SendAttributeAjax();
                }
            });
            // Ensure fonts load for the graph
            document.fonts.ready.then(function() {
                // Reopen closed assignments
                if ("open_assignments" in sessionStorage) {
                    const open_assignments = JSON.parse(sessionStorage.getItem("open_assignments"));
                    ($(".incomplete-works").length ? $(".assignment-container.incomplete-works .assignment") : $(".assignment")).filter(function() {
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
    loadAssignmentData: function($element_with_assignment_name_attribute) {
        return dat.find(assignment => assignment.assignment_name === $element_with_assignment_name_attribute.attr("data-assignment-name"));
    },
    // Resolves a resolver promise function when automatic scrolling ends
    // Scrolling detected with $("main").scroll(scroll);
    scroll: function(resolver) {
        clearTimeout(utils.scrollTimeout);
        // Runs when scroll ends
        utils.scrollTimeout = setTimeout(function() {
            $("main").off('scroll');
            resolver();
        }, 200);
    },
}

isExampleAccount = username === example_account_name// && 0;
ajaxUtils = {
    disable_ajax: isExampleAccount, // Even though there is a server side validation for disabling ajax on the example account, initally disable it locally to ensure things don't also get changed locally
    hour_to_update: hour_to_update,
    error: function(response, exception) {
        if (response.status == 0) {
            alert('Failed to connect');
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
        if (date_now.valueOf() + 1000*60*60*(24 + ajaxUtils.hour_to_update) < new Date().valueOf()) {
            const old_date_now = new Date(date_now.valueOf());
            date_now = new Date(new Date().toDateString());
            // If this runs after midnight, set date_now to yesterday
            if (new Date().getHours() < ajaxUtils.hour_to_update) {
                date_now.setDate(date_now.getDate() - 1);
            }
            const data = {
                'csrfmiddlewaretoken': csrf_token,
                'action': 'update_date_now',
                'date_now': utils.formatting.stringifyDate(date_now),
            }
            const days_since_example_ad = utils.daysBetweenTwoDates(date_now, old_date_now);
            if (isExampleAccount) {
                data["days_since_example_ad"] = days_since_example_ad;
                for (example_assignment of dat) {
                    example_assignment.assignment_date.setDate(example_assignment.assignment_date.getDate() + days_since_example_ad);
                }
            } else {
                const example_assignment = dat.find(sa_iter => sa_iter.assignment_name === example_assignment_name);
                if (example_assignment === undefined) {
                    data["days_since_example_ad"] = 0;
                } else {
                    data["days_since_example_ad"] = days_since_example_ad;
                    // Change example assignment date locally
                    // No need to change the due date locally because it is stored as the distance from the due date to the assignment date
                    // In this case, changing the assignment date automatically changes the due date
                    example_assignment.assignment_date.setDate(example_assignment.assignment_date.getDate() + days_since_example_ad);
                }
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
    ajaxFinishedTutorial: function() {
        if (ajaxUtils.disable_ajax) return;
        const data = {
            'csrfmiddlewaretoken': csrf_token,
            'action': 'finished_tutorial',
        }
        $.ajax({
            type: "POST",
            data: data,
            error: ajaxUtils.error,
        });
    },
    SendAttributeAjaxWithTimeout: function(key, value, pk) {
        if (ajaxUtils.disable_ajax) return;
        // Add key and values to the data being sent
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
    sa.assignment_date = new Date(utils.formatting.parseDate(sa.assignment_date));
    sa.x = utils.daysBetweenTwoDates(utils.formatting.parseDate(sa.x), sa.assignment_date);
    sa.y = +sa.y;
    sa.ctime = +sa.ctime;
    sa.funct_round = +sa.funct_round;
    sa.min_work_time /= sa.ctime; // Converts min_work_time to int if string or null
    sa.skew_ratio = +sa.skew_ratio;
    sa.works = sa.works.map(Number);
    sa.break_days = sa.break_days.map(Number);
    sa.tags = sa.tags || [];
}
({ warning_acceptance, def_min_work_time, def_skew_ratio, def_break_days, def_unit_to_minute, def_funct_round_minute, ignore_ends, show_progress_bar, color_priority, text_priority, enable_tutorial, date_now, highest_priority_color, lowest_priority_color } = JSON.parse(document.getElementById("settings-model").textContent));
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
    utils.ui.addTagHandlers();
    ordering.deleteStarredAssignmentsListener();
    ordering.autofillAssignmentsListener();
    utils.ui.setKeybinds();
    utils.ui.setAssignmentScaleUtils();
    utils.ui.saveStatesOnClose();
    utils.ui.handleTutorialIntroduction();
});
// Lock to landscape
if (!navigator.xr && self.isMobile && screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('landscape');
}
