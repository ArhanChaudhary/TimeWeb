/*
This file includes the code for:

Prioritizing, swapping, and coloring assignments
Animating assignments that were just created or modified

This only runs on index.html
*/
// THIS FILE HAS NOT YET BEEN FULLY DOCUMENTED
priority = {
    sort_timeout_duration: 2000,
    get_color: function(p) {
        if (isNaN(p)) return "";
        return `rgb(${lowest_priority_color.r+(highest_priority_color.r - lowest_priority_color.r)*p},${lowest_priority_color.g+(highest_priority_color.g - lowest_priority_color.g)*p},${lowest_priority_color.b+(highest_priority_color.b - lowest_priority_color.b)*p})`;
    },
    // Handles coloring and animating assignments that were just created or modified
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
            // Direct copy of loading in data from graph.js
            // Changing this is definitely on my todo list
            const dom_assignment = $(this);
            let sa = utils.loadAssignmentData(dom_assignment);
            let { ad, x, unit, y, dif_assign, skew_ratio, ctime, funct_round, min_work_time, break_days } = sa;
            ad = new Date(utils.formatting.parseDate(ad));
            x = utils.daysBetweenTwoDates(utils.formatting.parseDate(x), ad);
            y = +y;
            skew_ratio = +skew_ratio;
            ctime = +ctime;
            funct_round = +funct_round;
            min_work_time /= ctime;
            let display_format_minutes = false;
            function c_pset(x2, y2) {
                const context = {
                    x: x,
                    y: y,
                    break_days: break_days,
                    assign_day_of_week: assign_day_of_week,
                    funct_round: funct_round,
                    min_work_time: min_work_time,
                    min_work_time_funct_round: min_work_time_funct_round,
                    ignore_ends_mwt: ignore_ends_mwt,
                    red_line_start_x: red_line_start_x,
                    red_line_start_y: red_line_start_y,
                    skew_ratio: skew_ratio,
                    mods: mods,
                }
                return pset(context, x2, y2);
            }
            function c_funct(n, translate) {
                const context = {
                    red_line_start_x: red_line_start_x,
                    mods: mods,
                    return_y_cutoff: return_y_cutoff,
                    y: y,
                    break_days: break_days,
                    return_0_cutoff: return_0_cutoff,
                    red_line_start_y: red_line_start_y,
                    funct_round: funct_round,
                    min_work_time: min_work_time,
                    min_work_time_funct_round: min_work_time_funct_round,
                    a: a,
                    b: b,
                    cutoff_to_use_round: cutoff_to_use_round,
                    cutoff_transition_value: cutoff_transition_value,
                }
                return funct(n, context, translate);
            }
            function c_calc_mod_days() {
                const context = {
                    break_days: break_days,
                    assign_day_of_week: assign_day_of_week, 
                    red_line_start_x: red_line_start_x
                }
                return calc_mod_days(context);
            }
            let red_line_start_x = sa.fixed_mode ? 0 : sa.dynamic_start,
                red_line_start_y = sa.fixed_mode ? 0 : sa.works[red_line_start_x - dif_assign];
            if (funct_round > y - red_line_start_y) {
                funct_round = y - red_line_start_y;
            }
            if (min_work_time > y - red_line_start_y) {
                min_work_time = y - red_line_start_y;
            }
            if (min_work_time <= funct_round) {
                min_work_time = 0;
            } else if (funct_round < min_work_time && min_work_time < 2 * funct_round) {
                min_work_time = funct_round * 2;
            }
            const min_work_time_funct_round = min_work_time ? Math.ceil(min_work_time / funct_round) * funct_round : funct_round; // LCM of min_work_time and funct_round
            let len_works = sa.works.length - 1,
                lw = sa.works[len_works],
                ignore_ends_mwt = ignore_ends && min_work_time,
                unit_is_of_time = ["minute", "hour"].includes(pluralize(unit, 1).toLowerCase());
            let mods,
                assign_day_of_week = ad.getDay();
            if (break_days.length) {
                mods = c_calc_mod_days();
            }
            let a, b, cutoff_transition_value, cutoff_to_use_round, return_y_cutoff, return_0_cutoff;
            ({ a, b, skew_ratio, cutoff_transition_value, cutoff_to_use_round, return_y_cutoff, return_0_cutoff } = c_pset());

            // Will document soon
            let daysleft = utils.daysBetweenTwoDates(date_now, ad);
                todo = c_funct(len_works+dif_assign+1) - lw;
            const today_minus_dac = daysleft - dif_assign;
            const assignment_container = $(".assignment-container").eq(index),
                dom_status_image = $(".status-image").eq(index),
                dom_status_message = $(".status-message").eq(index),
                dom_title = $(".title").eq(index),
                dom_completion_time = $(".completion-time").eq(index);
            if (params.autofill_all_work_done && today_minus_dac > len_works && !params.do_not_autofill) {
                const number_of_forgotten_days = today_minus_dac-len_works; // Make this a variable so len_works++ doesn't affect this
                for (i = 0; i < number_of_forgotten_days; i++) {
                    todo = c_funct(len_works+dif_assign+1) - lw;
                    has_autofilled = true;
                    if (len_works + dif_assign === x) break; // Don't autofill past completion
                    lw += Math.max(0, todo);
                    sa.works.push(lw);
                    len_works++;
                }
                if (has_autofilled) {
                    ajaxUtils.SendAttributeAjaxWithTimeout("works", sa.works.map(String), sa.id);
                    ajaxUtils.SendAttributeAjaxWithTimeout("dynamic_start", sa.dynamic_start, sa.id);
                    todo = c_funct(len_works+dif_assign+1) - lw; // Update this if loop ends
                }
            }
            let strdaysleft, status_value, status_message, status_image;
            if (lw >= y) {
                status_image = "completely-finished";
                status_message = 'You are Completely Finished with this Assignment';
                dom_status_image.attr({
                    width: 16,
                    height: 16,
                }).css("margin-left", -3);
                status_value = 1;
                strdaysleft = '';
            } else if (daysleft < 0) {
                status_image = "not-assigned";
                status_message = 'This Assignment has Not Yet been Assigned';
                dom_status_image.attr({
                    width: 18,
                    height: 20,
                }).css("margin-left", -3);
                if (daysleft === -1) {
                    strdaysleft = 'Assigned Tomorrow';
                } else if (daysleft > -7) {
                    strdaysleft = `Assigned on ${ad.toLocaleDateString("en-US", {weekday: 'long'})}`;
                } else {
                    strdaysleft = `Assigned in ${-daysleft}d`;
                }
                status_value = 2;
            } else {
                if (today_minus_dac > len_works && !params.do_not_autofill) {
                    const number_of_forgotten_days = today_minus_dac-len_works; // Make this a variable so len_works++ doesn't affect this
                    for (i = 0; i < number_of_forgotten_days; i++) {
                        todo = c_funct(len_works+dif_assign+1) - lw;
                        const autofill_this_loop = params.autofill_no_work_done || todo <= 0 || break_days.includes((assign_day_of_week + len_works + dif_assign) % 7);
                        if (!autofill_this_loop || len_works + dif_assign === x - 1) break;
                        has_autofilled = true;
                        sa.works.push(lw);
                        len_works++;
                        if (todo) {
                            sa.dynamic_start = len_works + dif_assign;
                            if (!sa.fixed_mode) {
                                red_line_start_x = sa.dynamic_start;
                                red_line_start_y = sa.works[red_line_start_x - dif_assign];
                                if (break_days.length) {
                                    mods = c_calc_mod_days();
                                }
                                ({ a, b, skew_ratio, cutoff_transition_value, cutoff_to_use_round, return_y_cutoff, return_0_cutoff } = c_pset());
                            }
                        }
                    }
                    if (has_autofilled) {
                        ajaxUtils.SendAttributeAjaxWithTimeout("works", sa.works.map(String), sa.id);
                        ajaxUtils.SendAttributeAjaxWithTimeout("dynamic_start", sa.dynamic_start, sa.id);
                        todo = c_funct(len_works+dif_assign+1) - lw; // Update this if loop ends
                    }
                }
                let x1 = x - red_line_start_x;
                if (break_days.length) {
                    x1 -= Math.floor(x1 / 7) * break_days.length + mods[x1 % 7]; // Handles break days, explained later
                }
                daysleft = x - daysleft;
                if (today_minus_dac > len_works || !x1) {
                    status_image = 'question-mark';
                    if (!x1) {
                        status_message = 'This Assignment has no Working Days! Please Re-enter this assignment\'s Break Days';
                    } else {
                        status_message = "You haven't Entered your past Work inputs! Please Enter your Progress to Continue";
                    }
                    dom_status_image.attr({
                        width: 11,
                        height: 18,
                    }).css("margin-left", 2);
                    status_value = 6;
                } else if (todo <= 0 || today_minus_dac < len_works) {
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
                    if (len_works && (lw - sa.works[len_works - 1]) / warning_acceptance * 100 < c_funct(len_works + dif_assign) - sa.works[len_works - 1]) {
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
                    if (unit_is_of_time) {
                        status_message += `<br>Complete ${todo} ${pluralize(unit,todo)} of Work Today`;
                    } else {
                        status_message += `<br>Complete ${todo} ${pluralize(unit,todo)} Today`;
                    }
                    total += Math.ceil(sa.mark_as_done ? 0 : todo*ctime);
                }
                if (daysleft < -1) {
                    strdaysleft = -daysleft + "d Ago";
                } else if (daysleft === -1) {
                    strdaysleft = 'Yesterday';
                } else if (daysleft === 0) {
                    strdaysleft = 'Today';
                } else if (daysleft === 1) {
                    strdaysleft = 'Tomorrow';
                    tomorrow_total += Math.ceil(sa.mark_as_done ? 0 : todo*ctime);
                    if (status_value !== 6) {
                        status_value = 5;
                    }
                } else if (daysleft < 7) {
                    const due_date = new Date(ad.valueOf());
                    due_date.setDate(due_date.getDate() + x);
                    strdaysleft = due_date.toLocaleDateString("en-US", {weekday: 'long'});
                } else {
                    strdaysleft = daysleft + "d";
                }
            }
            // Add finished to assignment-container so it can easily be deleted with $(".finished").remove() when all finished assignments are deleted in advanced
            assignment_container.toggleClass("finished", status_value === 1);
            assignment_container.toggleClass("question-mark", status_value === 6);
            let status_priority;
            if (status_value === 1) {
                status_priority = -index;
            } else if (status_value === 2) {
                status_priority = daysleft;
            } else if (status_value === 6) {
                status_priority = -daysleft;
            } else {
                skew_ratio = 1;
                red_line_start_x = dif_assign;
                red_line_start_y = sa.works[0];
                if (break_days.length) {
                    mods = c_calc_mod_days();
                }
                ({ a, b, skew_ratio, cutoff_transition_value, cutoff_to_use_round, return_y_cutoff, return_0_cutoff } = c_pset());
                if (len_works + dif_assign === x || todo < 0 || len_works > today_minus_dac) {
                    status_priority = 0;
                } else if (len_works && daysleft !== 1) {
                    let sum_diff_red_blue = 0;
                    for (i = 1; i < len_works + 1; i++) { // Start at one because funct(0) - works[0] is always 0
                        if (!break_days.includes(assign_day_of_week + i - 1)) { // -1 to because of ignore break days if the day before sa.works[i] - c_funct(i + dif_assign); is a break day
                            // No need to worry about c_funct(i + dif_assign) being before dynamic_start because red_line_start_x is set to dif_assign
                            sum_diff_red_blue += sa.works[i] - c_funct(i + dif_assign);
                        }
                    }
                    const how_well_followed_const = 1-sum_diff_red_blue/len_works/y;
                    status_priority = Math.max(0, how_well_followed_const*todo*ctime/(x-dif_assign-len_works));
                } else {
                    status_priority = todo*ctime/(x-dif_assign-len_works);
                }
            }
            let priority_data = [status_value, status_priority, index];
            if (sa.mark_as_done && status_value !== 6) {
                priority_data.push(true);
            }
            ordered_assignments.push(priority_data);

            dom_status_image.attr("src", `${document.URL}static/images/status_icons/${status_image}.png`)
            dom_status_message.html(status_message);
            dom_title.attr("data-daysleft", strdaysleft);
            if (display_format_minutes) {
                dom_completion_time.html(utils.formatting.formatMinutes(todo * ctime));
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
            // originally sa[0] !== 6 && (sa[3] || $(".question-mark").length); if sa[3] is true then sa[0] !== 6;
            const mark_as_done = !!(sa[3] || $(".question-mark").length && sa[0] !== 6);
            const dom_assignment = $(".assignment").eq(sa[2]);
            let priority_percentage;
            if (sa[0] === 6) {
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
        if ($(".question-mark").length) {
            $("#autofill-work-done").show();
        } else {
            $("#autofill-work-done").hide();
        }
        if (!params.first_sort) ordering.setInitialTopAssignmentOffsets();
        ordering.sortAssignments(ordered_assignments);
        if (!params.first_sort) ordering.transitionSwaps();
        // Make sure this is set after assignments are sorted and swapped
        if (params.first_sort && $("#animate-in").length) {
            // Set initial transition values for "#animate-in"
            // Needs to be after domswap or else "top" bugs about 
            $("#animate-in").css({
                // 20+ and -10 deals with top and bottom margins
                "top": 20+$("#assignments-container").offset().top + $("#assignments-container").height() - $("#animate-in").offset().top,
                "opacity": "0",
                "margin-bottom": -$("#animate-in").height()-10,
            });
        }
        if ($(".question-mark").length) {
            $("#current-time, #tomorrow-time, #info").hide();
            $("#simulated-date").css("margin-top", -21);
        } else if (!total) {
            $("#info").show();
            $("#simulated-date").css("margin-top", "");
            $("#estimated-total-time").html(dat.length ? 'You have Finished everything for Today!' : 'You don\'t have any Assignments');
            $("#current-time, #tomorrow-time").hide();
            $("#hide-button").css("visibility", "hidden"); // Preserve layout positioning
        } else {
            $("#current-time, #tomorrow-time, #info").show();
            $("#simulated-date").css("margin-top", "");
            $("#estimated-total-time").html(utils.formatting.formatMinutes(total)).attr("data-minutes", total);
            $("#tomorrow-time").html(` (${tomorrow_total === total ? "All" : utils.formatting.formatMinutes(tomorrow_total)} due Tomorrow)`);
            $("#hide-button").css("visibility", "");
        }
        utils.ui.old_minute_value = undefined; // Force displayClock to update. Without this, it may not update and display (Invalid Date)
        utils.ui.displayClock();
        if (params.first_sort) {
            setInterval(utils.ui.displayClock, 1000);
        }
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
    transitionSwaps: function() {
        $(".assignment-container").each(function() {
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
                    const assignment_names_to_delete = $(".finished").map(function() {
                        return $(this).children(".assignment").attr("data-assignment-name")
                    }).toArray();
                    dat = dat.filter(iter_sa => !assignment_names_to_delete.includes(iter_sa.assignment_name));
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
        function replaceAutofillInfo() {
            $("#autofill-work-done-text").find(".info-button").remove();
            let message;
            switch ($("#autofill-selection").val()) {
                case "No":
                    message = `This applies to ALL assignments you haven't entered past work inputs for
                    
                    Assumes you haven't done anything since your last work input and autofills in no work done until today
                    
                    Click the horizontal line to perform this action`;
                    break;
                case "All":
                    message = `This applies to ALL assignments you haven't entered past work inputs for
                
                    Assumes you followed your work schedule since your last work input and autofills in all work done until today
                    
                    Click the horizontal line to perform this action`;
                    break;
            }
            $("#autofill-work-done-text").info("bottom", message, "append").css({marginLeft: -2, left: 1, bottom: 1});
        }
        $("#autofill-selection").on("change", replaceAutofillInfo);
        replaceAutofillInfo();
    }
}
document.addEventListener("DOMContentLoaded", function() {
    priority.sort({ first_sort: true, ignore_timeout: true });
});