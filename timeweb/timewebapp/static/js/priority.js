/*
This file includes the code for:

Prioritizing, swapping, and coloring assignments
Animating assignments that were just created or edited

This only runs on index.html
*/
// THIS FILE HAS NOT YET BEEN FULLY DOCUMENTED
priority = {
    sort_timeout_duration: 2000,
    get_color: function(p) {
        if (isNaN(p)) return "white";
        return `rgb(${lowest_priority_color.r+(highest_priority_color.r - lowest_priority_color.r)*p},${lowest_priority_color.g+(highest_priority_color.g - lowest_priority_color.g)*p},${lowest_priority_color.b+(highest_priority_color.b - lowest_priority_color.b)*p})`;
    },
    // Handles coloring and animating assignments that were just created or edited
    color_or_animate_assignment: function(dom_assignment, priority_percentage, is_element_submitted, color_instantly, mark_as_done) {
        if ($("#animate-in").length && is_element_submitted) {
            // If a new assignment was created and the assignment that color_or_animate_assignment() was called on is the assignment that was created, animate it easing in
            // I can't just have is_element_submitted as a condition because is_element_submitted will be true for both "#animate-in" and "#animate-color"
            dom_assignment.parents(".assignment-container").animate({
                top: "0", 
                opacity: "1", 
                marginBottom: "0",
            }, 1500, "easeOutCubic");
        }
        // A jQuery animation isn't needed for the background of "#animate-color" because it is transitioned using css
        if (color_priority) {
            if (color_instantly) {
                dom_assignment.addClass("color-instantly");
            }
            dom_assignment.css("background", priority.get_color(priority_percentage));
            dom_assignment.toggleClass("mark-as-done", mark_as_done);
            if (color_instantly) {
                dom_assignment[0].offsetHeight;
                dom_assignment.removeClass("color-instantly");
            }
        }
    },
    sort: function(params={}) {
        clearTimeout(priority.sort_timeout);
        if (params.ignore_timeout) {
            priority.sort_without_timeout(params);
        } else {
            priority.sort_timeout = setTimeout(() => priority.sort_without_timeout(params), priority.sort_timeout_duration);
        }
    },
    sort_without_timeout: function(params) {
        let ordered_assignments = [],
            total = 0,
            tomorrow_total = 0,
            has_autofilled = false;
        $(".assignment").each(function(index) {
            const dom_assignment = $(this);
            const sa = new Assignment(dom_assignment);
            sa.setParabolaValues();
            let display_format_minutes = false;
            let len_works = sa.sa.works.length - 1;
            let last_work_input = sa.sa.works[len_works];
            let today_minus_ad = utils.daysBetweenTwoDates(date_now, sa.sa.assignment_date);
            let todo = sa.funct(len_works+sa.sa.blue_line_start+1) - last_work_input;
            const assignment_container = $(".assignment-container").eq(index),
                dom_status_image = $(".status-image").eq(index),
                dom_status_message = $(".status-message").eq(index),
                dom_title = $(".title").eq(index),
                dom_completion_time = $(".completion-time").eq(index);
            if (params.autofill_all_work_done && today_minus_ad > sa.sa.blue_line_start + len_works && !params.do_not_autofill) {
                const number_of_forgotten_days = today_minus_ad - sa.sa.blue_line_start - len_works; // Make this a variable so len_works++ doesn't affect this
                for (i = 0; i < number_of_forgotten_days; i++) {
                    todo = sa.funct(len_works+sa.sa.blue_line_start+1) - last_work_input;
                    has_autofilled = true;
                    if (len_works + sa.sa.blue_line_start === sa.sa.x) break; // Don't autofill past completion
                    last_work_input += Math.max(0, todo);
                    sa.sa.works.push(last_work_input);
                    len_works++;
                }
                if (has_autofilled) {
                    ajaxUtils.SendAttributeAjaxWithTimeout("works", sa.sa.works.map(String), sa.sa.id);
                    ajaxUtils.SendAttributeAjaxWithTimeout("dynamic_start", sa.sa.dynamic_start, sa.sa.id);
                    todo = sa.funct(len_works+sa.sa.blue_line_start+1) - last_work_input; // Update this if loop ends
                }
            }
            let str_daysleft, status_value, status_message, status_image;
            if (sa.sa.needs_more_info) {
                status_image = 'question-mark';
                status_message = "This Assignment needs more Info!<br>Please Edit this Assignment";
                status_value = 6;
                dom_status_image.attr({
                    width: 11,
                    height: 18,
                }).css("margin-left", 2);
            } else if (last_work_input >= sa.sa.y) {
                status_image = "completely-finished";
                status_message = 'You are Completely Finished with this Assignment';
                dom_status_image.attr({
                    width: 16,
                    height: 16,
                }).css("margin-left", -3);
                status_value = 1;
                str_daysleft = '';
            } else if (today_minus_ad < 0) {
                status_image = "not-assigned";
                status_message = 'This Assignment has Not Yet been Assigned';
                dom_status_image.attr({
                    width: 18,
                    height: 20,
                }).css("margin-left", -3);
                if (today_minus_ad === -1) {
                    str_daysleft = 'Assigned Tomorrow';
                } else if (today_minus_ad > -7) {
                    str_daysleft = `Assigned on ${sa.sa.assignment_date.toLocaleDateString("en-US", {weekday: 'long'})}`;
                } else {
                    str_daysleft = `Assigned in ${-today_minus_ad}d`;
                }
                status_value = 2;
            } else {
                if (today_minus_ad > len_works + sa.sa.blue_line_start && !params.do_not_autofill) {
                    const number_of_forgotten_days = today_minus_ad - sa.sa.blue_line_start - len_works; // Make this a variable so len_works++ doesn't affect this
                    for (i = 0; i < number_of_forgotten_days; i++) {
                        todo = sa.funct(len_works+sa.sa.blue_line_start+1) - last_work_input;
                        const autofill_this_loop = params.autofill_no_work_done || todo <= 0 || sa.sa.break_days.includes((sa.assign_day_of_week + len_works + sa.sa.blue_line_start) % 7);
                        if (!autofill_this_loop || len_works + sa.sa.blue_line_start === sa.sa.x - 1) break;
                        has_autofilled = true;
                        sa.sa.works.push(last_work_input);
                        len_works++;
                        if (todo) {
                            sa.sa.dynamic_start = len_works + sa.sa.blue_line_start;
                            if (!sa.sa.fixed_mode) {
                                sa.red_line_start_x = sa.sa.dynamic_start;
                                sa.red_line_start_y = sa.sa.works[sa.red_line_start_x - sa.sa.blue_line_start];
                                if (sa.sa.break_days.length) {
                                    sa.mods = sa.calcModDays();
                                }
                                sa.setParabolaValues();
                            }
                        }
                    }
                    if (has_autofilled) {
                        ajaxUtils.SendAttributeAjaxWithTimeout("works", sa.sa.works.map(String), sa.sa.id);
                        ajaxUtils.SendAttributeAjaxWithTimeout("dynamic_start", sa.sa.dynamic_start, sa.sa.id);
                        todo = sa.funct(len_works+sa.sa.blue_line_start+1) - last_work_input; // Update this if loop ends
                    }
                }
                let x1 = sa.sa.x - sa.red_line_start_x;
                if (sa.sa.break_days.length) {
                    x1 -= Math.floor(x1 / 7) * sa.sa.break_days.length + sa.mods[x1 % 7]; // Handles break days, explained later
                }
                var due_date_minus_today = sa.sa.x - today_minus_ad;
                if (today_minus_ad > len_works + sa.sa.blue_line_start || !x1) {
                    status_image = 'question-mark';
                    if (!x1) {
                        status_message = 'This Assignment has no Working Days!<br>Please Edit this Assignment\'s break days';
                        status_value = 7;
                    } else {
                        status_message = "You haven't Entered your past Work Inputs!<br>Please Enter your Progress to Continue";
                        status_value = 8;
                    }
                    dom_status_image.attr({
                        width: 11,
                        height: 18,
                    }).css("margin-left", 2);
                } else if (todo <= 0 || today_minus_ad < len_works + sa.sa.blue_line_start) {
                    status_image = 'finished';
                    status_message = 'Nice Job! You are Finished with this Assignment\'s Work for Today';
                    dom_status_image.attr({
                        width: 15,
                        height: 15,
                    }).css("margin-left", -2);
                    status_value = 3;
                } else {
                    status_value = 4;
                    display_format_minutes = true;
                    if (len_works && (last_work_input - sa.sa.works[len_works - 1]) / warning_acceptance * 100 < sa.funct(len_works + sa.sa.blue_line_start) - sa.sa.works[len_works - 1]) {
                        status_image = 'warning';
                        dom_status_image.attr({
                            width: 7,
                            height: 22,
                        }).css("margin-left", 5);
                        status_message = 'Warning! You are behind your Work schedule!';
                    } else {
                        status_image = 'unfinished';
                        status_message = "This Assignment's Daily Work is Unfinished";
                        dom_status_image.attr({
                            width: 15,
                            height: 15,
                        }).css("margin-left", -2);
                    }
                    if (sa.unit_is_of_time) {
                        status_message += `<br>Complete ${todo} ${pluralize(sa.sa.unit,todo)} of Work Today`;
                    } else {
                        status_message += `<br>Complete ${todo} ${pluralize(sa.sa.unit,todo)} Today`;
                    }
                    total += Math.ceil(sa.sa.mark_as_done ? 0 : todo*sa.sa.ctime);
                }
                if (due_date_minus_today < -1) {
                    str_daysleft = -due_date_minus_today + "d Ago";
                } else if (due_date_minus_today === -1) {
                    str_daysleft = 'Yesterday';
                } else if (due_date_minus_today === 0) {
                    str_daysleft = 'Today';
                } else if (due_date_minus_today === 1) {
                    str_daysleft = 'Tomorrow';
                    tomorrow_total += Math.ceil(sa.sa.mark_as_done ? 0 : todo*sa.sa.ctime);
                    if (![6,7,8].includes(status_value)) {
                        status_value = 5;
                    }
                } else if (due_date_minus_today < 7) {
                    const due_date = new Date(sa.sa.assignment_date.valueOf());
                    due_date.setDate(due_date.getDate() + sa.sa.x);
                    str_daysleft = due_date.toLocaleDateString("en-US", {weekday: 'long'});
                } else {
                    str_daysleft = due_date_minus_today + "d";
                }
            }
            // Add finished to assignment-container so it can easily be deleted with $(".finished").remove() when all finished assignments are deleted in advanced
            assignment_container.toggleClass("finished", status_value === 1);
            assignment_container.toggleClass("incomplete-works", status_value === 8);
            assignment_container.toggleClass("question-mark", [6,7,8].includes(status_value));
            let status_priority;
            if (status_value === 1) {
                status_priority = -index;
            } else if (status_value === 2) {
                status_priority = today_minus_ad;
            } else if ([6,7,8].includes(status_value)) {
                // Order by assignments closest to their due date
                status_priority = -due_date_minus_today;
            } else {
                const original_skew_ratio = sa.sa.skew_ratio;
                sa.sa.skew_ratio = 1;
                sa.red_line_start_x = sa.sa.blue_line_start;
                sa.red_line_start_y = sa.sa.works[0];
                if (sa.sa.break_days.length) {
                    sa.mods = sa.calcModDays();
                }
                sa.setParabolaValues();
                sa.sa.skew_ratio = original_skew_ratio;
                if (len_works + sa.sa.blue_line_start === sa.sa.x || todo < 0 || len_works + sa.sa.blue_line_start > today_minus_ad) {
                    status_priority = 0;
                } else if (len_works && due_date_minus_today !== 1) {
                    let sum_diff_red_blue = 0;
                    for (i = 1; i < len_works + 1; i++) { // Start at one because funct(0) - works[0] is always 0
                        if (!sa.sa.break_days.includes(sa.assign_day_of_week + i - 1)) { // -1 to because of ignore break days if the day before sa.works[i] - sa.funct(i + blue_line_start); is a break day
                            // No need to worry about sa.funct(i + blue_line_start) being before dynamic_start because red_line_start_x is set to blue_line_start
                            sum_diff_red_blue += sa.sa.works[i] - sa.funct(i + sa.sa.blue_line_start);
                        }
                    }
                    const how_well_followed_const = 1-sum_diff_red_blue/len_works/sa.sa.y;
                    status_priority = Math.max(0, how_well_followed_const*todo*sa.sa.ctime/(sa.sa.x-sa.sa.blue_line_start-len_works));
                } else {
                    status_priority = todo*sa.sa.ctime/(sa.sa.x-sa.sa.blue_line_start-len_works);
                }
            }
            let priority_data = [status_value, status_priority, index];
            if (sa.sa.mark_as_done && ![6,7,8].includes(status_value)) {
                priority_data.push(true);
            }
            ordered_assignments.push(priority_data);

            dom_status_image.attr("src", `/static/images/status_icons/${status_image}.png`)
            dom_status_message.html(status_message);
            dom_title.attr("data-daysleft", str_daysleft);
            if (display_format_minutes) {
                dom_completion_time.html(utils.formatting.formatMinutes(todo * sa.sa.ctime));
            } else {
                dom_completion_time.html('');
            }
        });
        // fixes graph not updating from skew ratio causing autofill
        if (has_autofilled) {
            $(window).trigger("resize");
        }
        ordered_assignments.sort(function(a, b) {
            // Sort from max to min
            if (a[0] < b[0]) return 1;
            if (a[0] > b[0]) return -1;
            if (a[1] < b[1]) return 1;
            if (a[1] > b[1]) return -1;

            if (a[2] < b[2]) return -1;
            if (a[2] > b[2]) return 1;
        });
        const highest_priority = Math.max(...ordered_assignments.map(function(sa) {
            if ((sa[0] === 5 || sa[0] === 4) && !sa[3]) {
                return sa[1];
            } else {
                return -Infinity;
            }
        }));
        for (let sa of ordered_assignments) {
            // originally ![6,7,8].includes(sa[0]) && (sa[3] || $(".question-mark").length); if sa[3] is true then ![6,7,8].includes(sa[0])
            const mark_as_done = !!(sa[3] || $(".question-mark").length && ![6,7,8].includes(sa[0]));
            const dom_assignment = $(".assignment").eq(sa[2]);
            let priority_percentage;
            if ([6,7,8].includes(sa[0])) {
                priority_percentage = NaN;
            } else if (mark_as_done || sa[0] === 3 || sa[0] === 1 || sa[0] === 2 /* Last one needed for "This assignment has not yet been assigned" being set to color() values greater than 1 */) {
                priority_percentage = 0;
            } else {
                priority_percentage = Math.max(1, Math.floor(sa[1] / highest_priority * 100 + 1e-10));
                if (isNaN(priority_percentage)) {
                    priority_percentage = 100;
                }
            }
            if (text_priority) {
                const dom_title = $(".title").eq(sa[2]);
                if ((sa[0] === 5 || sa[0] === 4) && !mark_as_done) {
                    dom_title.attr("data-priority", `Priority: ${priority_percentage}%`);               
                } else {
                    dom_title.attr("data-priority", "");       
                }
            }
            const assignment_container = dom_assignment.parents(".assignment-container");
            if (params.first_sort && assignment_container.is("#animate-color, #animate-in")) {
                new Promise(function(resolve) {
                    $(window).one('load', function() {
                        // Since "#animate-in" will have a bottom margin of negative its height, the next assignment will be in its final position at the start of the animation
                        // So, scroll to the next assignment instead
                        let assignment_to_scroll_to = $("#animate-in").next();
                        if (!assignment_to_scroll_to.length) {
                            // If "#animate-color" or "#animate-in" is the last assignment on the list, scroll to itself instead
                            assignment_to_scroll_to = dom_assignment;
                        }
                        setTimeout(function() {
                            // scrollIntoView sometimes doesn't work without setTimeout
                            assignment_to_scroll_to[0].scrollIntoView({
                                behavior: 'smooth',
                                block: 'nearest',
                            });
                        }, 0);
                        // The scroll function determines when the page has stopped scrolling and internally resolves the promise via "resolver"
                        $("main").scroll(() => utils.scroll(resolve));
                        utils.scroll(resolve);
                    });
                }).then(() => priority.color_or_animate_assignment(dom_assignment, priority_percentage/100, true, params.first_sort, mark_as_done));
            } else {
                priority.color_or_animate_assignment(dom_assignment, priority_percentage/100, false, params.first_sort, mark_as_done);
            }
        }
        if ($(".finished").length) {
            $("#delete-starred-assignments").show().insertBefore($(".finished").first().children(".assignment"));
        } else {
            $("#delete-starred-assignments").hide();
        }
        if ($(".incomplete-works").length) {
            $("#autofill-work-done").show();
        } else {
            $("#autofill-work-done").hide();
        }
        if (!params.first_sort) ordering.setInitialTopAssignmentOffsets();
        ordering.sortAssignments(ordered_assignments);
        if (params.first_sort) {
            const number_of_assignments = $(".assignment").length;
            $(".assignment").each(function(index) {
                // Fixes the tag add box going behind the below assignment on scale
                $(this).css("z-index", number_of_assignments - index);
                $(this).find(".button").css("height", $(this).innerHeight());
            });
        } else {
            ordering.transitionSwapsAndSetZIndex();
        }
        // Make sure this is set after assignments are sorted and swapped
        if (params.first_sort && $("#animate-in").length) {
            // Set initial transition values for "#animate-in"
            // Needs to be after domswap or else "top" bugs out 
            $("#animate-in").css({
                "top": $("#assignments-container").offset().top + $("#assignments-container").height() - $("#animate-in").offset().top + 20, // Move to below the last assignment and add a 20px margin
                "opacity": "0",
                "margin-bottom": -($("#animate-in").height()+10), // +10 deals with margins
            });
        }
        // Replicates first-of-class and last-of-class to draw the shortcut line wrapper in index.css
        $(".first-finished").removeClass("first-finished");
        $(".finished").first().addClass("first-finished");
        $(".last-finished").removeClass("last-finished");
        $(".finished").last().addClass("last-finished");
        $(".last-incomplete-works").removeClass("last-incomplete-works");
        $(".incomplete-works").last().addClass("last-incomplete-works");
        if ($(".question-mark").length) {
            $("#current-time, #tomorrow-time, #info").hide();
            $("#simulated-date").css({
                marginTop: -23, 
                transform: "translateY(-6px)",
            });
        } else if (!total) {
            $("#info").show();
            $("#simulated-date").css({
                marginTop: "", 
                transform: "",
            });
            $("#estimated-total-time").html(dat.length ? 'You have Finished everything for Today!' : 'You don\'t have any Assignments');
            $("#current-time, #tomorrow-time").hide();
            $("#hide-button").css("display", "none");
        } else {
            $("#current-time, #tomorrow-time, #info").show();
            $("#simulated-date").css({
                marginTop: "", 
                transform: ""
            });
            $("#estimated-total-time").html(utils.formatting.formatMinutes(total)).attr("data-minutes", total);
            $("#tomorrow-time").html(` (${tomorrow_total === total ? "All" : utils.formatting.formatMinutes(tomorrow_total)} due Tomorrow)`);
            $("#hide-button").css("display", "");
        }
        utils.ui.old_minute_value = undefined; // Force displayClock to update. Without this, it may not update and display (Invalid Date)
        utils.ui.displayClock();
        if (params.first_sort) {
            setInterval(utils.ui.displayClock, 1000);
        }
        $("#assignments-container").css("opacity", "1");
    },
}
ordering = {

    setInitialTopAssignmentOffsets: function() {
        $(".assignment-container").each(function() {
            $(this).attr("data-initial-top-offset", $(this).offset().top);
        });
    },

    sortAssignments: function(ordered_assignments) {
        // Selection sort
        for (let [index, sa] of ordered_assignments.entries()) {
            // index represents the selected assignment's final position
            // sa[2] represents the selected assignment's current position
            if (index !== sa[2]) {
                // Swap them in the dom
                ordering.domSwapAssignments(index, sa[2]);
                // Swap them in ordered_assignments
                ordered_assignments.find(sa => sa[2] === index)[2] = sa[2]; // Adjust index of assignment that used to be there 
                sa[2] = index; // Adjust index of current swapped assignment
            }
        }
    },

    domSwapAssignments: function(tar1_index, tar2_index) {  
        const tar1 = $(".assignment-container").eq(tar1_index),
                tar2 = $(".assignment-container").eq(tar2_index);
        const swap_temp = $("<span></span>").insertAfter(tar2);
        tar1.after(tar2);
        swap_temp.after(tar1);
        swap_temp.remove();
    },

    transitionSwapsAndSetZIndex: function() {
        const number_of_assignments = $(".assignment").length;
        $(".assignment-container").each(function(index) {
            const initial_height = $(this).attr("data-initial-top-offset");
            const current_translate_value = ($(this).css("transform").split(",")[5]||")").slice(0,-1); // Reads the translateY value from the returned matrix
            // If an assignment is doing a transition and this is called again, subtract its transform value to find its final top offset
            const final_height = $(this).offset().top - Math.sign(current_translate_value) * Math.floor(Math.abs(current_translate_value)); // the "Math" stuff floors or ceils the value closer to zero
            const transform_value = initial_height - final_height;
            $(this).removeAttr("data-initial-top-offset");
            $(this).addClass("transform-instantly")
                    .css("transform", `translateY(${transform_value}px)`)
                    [0].offsetHeight;
            $(this).removeClass("transform-instantly")
                    .css({
                        transform: "",
                        transitionDuration: `${1.75 + Math.abs(transform_value)/2000}s`, // Delays longer transforms
                    });
            // Fixes the tag add box going behind the below assignment on scale
            $(this).children(".assignment").css("z-index", number_of_assignments - index);
        });
    },
    deleteStarredAssignmentsListener: function() {
        $("#delete-starred-assignments-text").click(function() {
            if (isMobile ? confirm(`This will delete ${$(".finished").length} starred assignments. Are you sure?`) : confirm(`This will delete ${$(".finished").length} finished assignments. Are you sure? (Press enter)`)) {
                const finished_assignments = $(".assignment-container").map(function() {
                    if ($(this).hasClass("finished")) {
                        return utils.loadAssignmentData($(this).children(".assignment")).id;
                    }
                }).toArray();
                const data = {
                    'csrfmiddlewaretoken': csrf_token,
                    'action': 'delete_assignment',
                    'assignments': JSON.stringify(finished_assignments),
                }
                const success = function() {
                    const assignment_ids_to_delete = $(".finished").map(function() {
                        return utils.loadAssignmentData($(this).children(".assignment")).id;
                    }).toArray();
                    // Remove ids to delete from dat
                    dat = dat.filter(iter_sa => !assignment_ids_to_delete.includes(iter_sa.id));
                    $(".finished").remove();
                    if (!ajaxUtils.disable_ajax) {
                        for (let i = 0; i < finished_assignments.length; i++) {
                            gtag("event","delete_assignment");
                        }
                    }
                    priority.sort({ ignore_timeout: true });
                }
                if (ajaxUtils.disable_ajax) return success();
                // Send ajax to avoid a page reload
                $.ajax({
                    type: "POST",
                    data: data,
                    success: success,
                    error: ajaxUtils.error,
                });
            }
        });
    },
    autofillAssignmentsListener: function() {
        $("#autofill-work-done").click(function(e) {
            if ($(e.target).is("#autofill-selection")) return;
            switch ($("#autofill-selection").val()) {
                case "No":
                    if (confirm("This will autofill no work done until today for ALL assignments with missing work inputs. Are you sure?")) {
                        priority.sort({autofill_no_work_done: true, ignore_timeout: true});
                    }
                    break;
                case "All":
                    if (confirm("This will autofill all work done until today for ALL assignments with missing work inputs. Are you sure?")) {
                        priority.sort({autofill_all_work_done: true, ignore_timeout: true});
                    }
                    break;
            }
        });
        replaceAutofillInfo();
        $("#autofill-selection").on("change", replaceAutofillInfo);
        function replaceAutofillInfo() {
            $("#autofill-work-done-text").find(".info-button").remove();
            let message;
            switch ($("#autofill-selection").val()) {
                case "No":
                    message = `Assumes you haven't done anything since your last work input and autofills in no work done until today. This applies to ALL assignments you haven't entered past work inputs for
                    
                    Click the horizontal line to perform this action`;
                    break;
                case "All":
                    message = `Assumes you followed your work schedule since your last work input and autofills in all work done until today. This applies to ALL assignments you haven't entered past work inputs for
                    
                    Click the horizontal line to perform this action`;
                    break;
            }
            $("#autofill-work-done-text").info("bottom", message, "append").css({marginLeft: -2, left: 1, bottom: 1});
        }
    }
}
document.addEventListener("DOMContentLoaded", function() {
    priority.sort({ first_sort: true, ignore_timeout: true });
});