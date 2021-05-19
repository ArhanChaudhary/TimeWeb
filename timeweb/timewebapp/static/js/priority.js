/*
This file includes the code for:

Prioritizing, swapping, and coloring assignments
Animating assignments that were just created or modified

This only runs on index.html
*/
// THIS FILE HAS NOT YET BEEN FULLY DOCUMENTED
priority = {
    sort_timeout_duration: 3000,
    get_color: function(p) {
        if (isNaN(p)) {
            return "";
        } else {
            return `rgb(${132+94*p},${200-109*p},${65+15*p})`;
        } 
    },
    // Handles coloring and animating assignments that were just created or modified
    color_or_animate_assignment: function($assignment, priority_percentage, is_element_submitted, color_instantly, mark_as_done) {
        if ($("#animate-in").length && is_element_submitted) {
            // If a new assignment was created and the assignment that color_or_animate_assignment() was called on is the assignment that was created, animate it easing in
            // I can't just have is_element_submitted as a condition because is_element_submitted will be true for both "#animate-in" and "#animate-color"
            $assignment.parent().animate({
                top: "0", 
                opacity: "1", 
                marginBottom: "0",
            }, 1500, "easeOutCubic");
        }
        // A jQuery animation isn't needed for the background of "#animate-color" because it is transitioned using css
        if (color_priority) {
            if (color_instantly) {
                $assignment.addClass("color-instantly");
            }
            $assignment.css("background", priority.get_color(priority_percentage));
            $assignment.toggleClass("mark-as-done", mark_as_done);
            if (color_instantly) {
                $assignment[0].offsetHeight;
                $assignment.removeClass("color-instantly");
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
            trigger_resize_from_autofill = false,
            incomplete_works = false;
        $(".assignment").each(function(index) {
            // Cancel current swaps and dequeue other swaps
            $(document).clearQueue();
            $(".assignment-container").removeAttr("style").stop();
            // Direct copy of loading in data from graph.js
            // Changing this is definitely on my todo list
            const dom_assignment = $(this);
            let sa = utils.loadAssignmentData(dom_assignment);
            let { ad, x, unit, y, dif_assign, skew_ratio, ctime, funct_round, min_work_time, nwd } = sa;
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
                    nwd: nwd,
                    assign_day_of_week: assign_day_of_week,
                    funct_round: funct_round,
                    min_work_time: min_work_time,
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
                    nwd: nwd,
                    return_0_cutoff: return_0_cutoff,
                    red_line_start_y: red_line_start_y,
                    funct_round: funct_round,
                    min_work_time: min_work_time,
                    a: a,
                    b: b,
                    cutoff_to_use_round: cutoff_to_use_round,
                    cutoff_transition_value: cutoff_transition_value,
                }
                return funct(n, context, translate);
            }
            function c_calc_mod_days() {
                const context = {
                    nwd: nwd,
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
            let len_works = sa.works.length - 1,
                lw = sa.works[len_works],
                ignore_ends_mwt = ignore_ends && min_work_time,
                unit_is_minute = pluralize(unit, 1).toLowerCase() === "minute";
            let mods,
                assign_day_of_week = ad.getDay();
            if (nwd.length) {
                mods = c_calc_mod_days();
            }
            let a, b, cutoff_transition_value, cutoff_to_use_round, return_y_cutoff, return_0_cutoff;
            ({ a, b, skew_ratio, cutoff_transition_value, cutoff_to_use_round, return_y_cutoff, return_0_cutoff } = c_pset());

            // Will document soon
            let daysleft = utils.daysBetweenTwoDates(date_now, ad);
                todo = c_funct(len_works+dif_assign+1) - lw;
            const today_minus_dac = daysleft - dif_assign;
            const assignmentIsInProgress = () => today_minus_dac === len_works - 1 && c_funct(len_works + dif_assign) > lw && !nwd.includes(date_now.getDay());
            const assignment_container = $(".assignment-container").eq(index),
                dom_status_image = $(".status-image").eq(index),
                dom_status_message = $(".status-message").eq(index),
                dom_title = $(".title").eq(index),
                dom_completion_time = $(".completion-time").eq(index);
            let strdaysleft, status_value, status_message, status_image;
            if (lw >= y || x <= daysleft) {
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
                    let has_autofilled = false;
                    const number_of_forgotten_days = today_minus_dac-len_works; // Make this a variable so len_works++ doesn't affect this
                    for (i = 0; i < number_of_forgotten_days; i++) {
                        if (has_autofilled) {
                            todo = c_funct(len_works+dif_assign+1) - lw;
                        }
                        const autofill_this_loop = params.autofill_override || todo <= 0 || nwd.includes((assign_day_of_week + len_works + dif_assign) % 7);
                        if (!autofill_this_loop || len_works + dif_assign === x - 1) {
                            break;
                        }
                        has_autofilled = true;
                        sa.works.push(lw);
                        len_works++;
                        if (todo) {
                            sa.dynamic_start = len_works + dif_assign;
                            if (!sa.fixed_mode) {
                                red_line_start_x = sa.dynamic_start;
                                red_line_start_y = sa.works[red_line_start_x - dif_assign];
                                if (nwd.length) {
                                    mods = c_calc_mod_days();
                                }
                                ({ a, b, skew_ratio, cutoff_transition_value, cutoff_to_use_round, return_y_cutoff, return_0_cutoff } = c_pset());
                            }
                        }
                    }
                    if (has_autofilled) {
                        ajaxUtils.SendAttributeAjaxWithTimeout("works", sa.works.map(String), sa.id);
                        ajaxUtils.SendAttributeAjaxWithTimeout("dynamic_start", sa.dynamic_start, sa.id);
                        todo = c_funct(len_works+dif_assign+1) - lw;
                        trigger_resize_from_autofill = true;
                    }
                }
                let x1 = x - red_line_start_x;
                if (nwd.length) {
                    x1 -= Math.floor(x1 / 7) * nwd.length + mods[x1 % 7]; // Handles break days, explained later
                }
                daysleft = x - daysleft;
                if ((today_minus_dac > len_works && len_works + dif_assign < x) || !x1) {
                    status_image = 'question-mark';
                    if (!x1) {
                        status_message = 'This Assignment has no Working Days! Please Re-enter this assignment\'s Break Days';
                    } else {
                        status_message = "You haven't Entered your past Work Inputs! Please Enter your Progress to Continue";
                    }
                    dom_status_image.attr({
                        width: 11,
                        height: 18,
                    }).css("margin-left", 2);
                    status_value = 6;
                    incomplete_works = true;
                } else if (!assignmentIsInProgress() && (todo <= 0 || today_minus_dac < len_works)) {
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
                    if (assignmentIsInProgress()) {
                        status_image = 'in-progress';
                        status_message = "This Assignment's Daily Work is in Progress";
                        dom_status_image.attr({
                            width: 17,
                            height: 17,
                        }).css("margin-left", -2);
                        todo = c_funct(len_works+dif_assign) - lw;
                    } else if (len_works && (lw - sa.works[len_works - 1]) / warning_acceptance * 100 < c_funct(len_works + dif_assign) - sa.works[len_works - 1]) {
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
                    if (unit_is_minute) {
                        status_message += `<br>Complete ${todo} ${pluralize(unit,todo)} of Work Today`;
                    } else {
                        status_message += `<br>Complete ${todo} ${pluralize(unit,todo)} Today`;
                    }
                    total += Math.ceil(sa.mark_as_done ? 0 : todo*ctime);
                }
                if (daysleft === 1) {
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
            if (status_value === 1) {
                assignment_container.addClass("finished");
            } else {
                assignment_container.removeClass("finished");
            }
            let status_priority;
            if ([6,2,1].includes(status_value)) {
                status_priority = -Math.abs(daysleft);
            } else {
                skew_ratio = 1;
                red_line_start_x = dif_assign;
                red_line_start_y = sa.works[0];
                if (nwd.length) {
                    mods = c_calc_mod_days();
                }
                ({ a, b, skew_ratio, cutoff_transition_value, cutoff_to_use_round, return_y_cutoff, return_0_cutoff } = c_pset());

                len_works -= assignmentIsInProgress();
                if (x-dif_assign-len_works === 0 || todo < 0 || len_works > today_minus_dac) {
                    status_priority = 0;
                } else if (len_works && daysleft !== 1) {
                    let sum_diff_red_blue = 0;
                    for (i = 0; i <= len_works; i++) {
                        if (!nwd.includes(assign_day_of_week + i - 1)) {
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
        // fixes graph not updating after skew ratio causes autofill
        if (trigger_resize_from_autofill) {
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
            // originally assignment[0] !== 6 && (assignment[3] || incomplete_works); if assignment[3] is true then assignment[0] !== 6;
            const mark_as_done = sa[3] || incomplete_works && sa[0] !== 6;
            const dom_assignment = $(".assignment").eq(sa[2]);
            let priority_percentage;
            if (sa[0] === 6) {
                priority_percentage = NaN;
            } else if (mark_as_done || sa[0] === 3 || sa[0] === 1 || sa[0] === 2 /* Last one needed for "This assignment has not yet been assigned" being set to color() values greater than 1 */) {
                priority_percentage = 0;
            } else {
                priority_percentage = Math.max(1, Math.floor(sa[1] / highest_priority * 100 + 1e-10));
            }
            if (text_priority) {
                const dom_title = $(".title").eq(sa[2]);
                if ((sa[0] === 5 || sa[0] === 4) && !mark_as_done) {
                    dom_title.attr("data-priority", `Priority: ${priority_percentage}%`);               
                } else {
                    dom_title.attr("data-priority", "");       
                }
            }
            const assignment_container = dom_assignment.parent();
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
        // Have this after above to preserve index on sa
        for (let [index, sa] of ordered_assignments.entries()) {
            // Index represents the final position
            // sa[2] represnets its current position
            if (index !== sa[2]) {
                ordering.swap(index, sa[2], params.first_sort);
                ordered_assignments.find(sa => sa[2] === index)[2] = sa[2] // Adjust index of assignment that used to be there 
                sa[2] = index; // Adjust index of current swapped assignment
            }
        }
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
        if (incomplete_works) {
            $("#estimated-total-time").html('Please enter your past work inputs');
            $("#current-time, #tomorrow-time").hide();
        } else if (!total) {
            $("#estimated-total-time").html(dat.length ? 'You have Finished everything for Today!' : 'You don\'t have any Assignments');
            $("#current-time, #tomorrow-time").hide();
            $("#hide-button").css("visibility", "hidden"); // Preserve layout positioning
        } else {
            $("#estimated-total-time").html(utils.formatting.formatMinutes(total)).attr("data-minutes", total);
            $("#tomorrow-time").html(` (${tomorrow_total === total ? "All" : utils.formatting.formatMinutes(tomorrow_total)} due Tomorrow)`)
            $("#current-time, #tomorrow-time").show();
            $("#hide-button").css("visibility", "");
        }
        utils.ui.displayClock();
        if (params.first_sort) {
            setInterval(utils.ui.displayClock, 1000);
        }
    },
}
ordering = {
    swap_duration: 1000,
    swap: function(tar1_index, tar2_index, swap_instantly=false) {
        // Queues each swap
        if (tar1_index === tar2_index) return;
        if (swap_instantly) return DOMswap();
        $(document).queue(function() {
            // Swap assignment containers because they don't have a transition
            const tar1 = $(".assignment-container").eq(tar1_index),
                tar2 = $(".assignment-container").eq(tar2_index);
            const tar1_height = tar1.height() + 10,
                tar2_height = tar2.height() + 10; 
            // Deal with existing assingment margin
            if (tar1_height > tar2_height) {
                tar2.css("margin-top", 10);
            } else {
                tar1.css("margin-bottom", 10);
            }
            tar1.animate({
                top: tar2.offset().top + tar2_height - tar1.offset().top - tar1_height,
                marginBottom: "-=" + (tar1_height - tar2_height),
            }, {
                queue: false,
                duration: ordering.swap_duration,
                easing: "easeInOutQuad",
            });

            tar2.animate({
                bottom: tar2.offset().top - tar1.offset().top,
                marginTop: "+=" + (tar1_height - tar2_height),
            }, {
                queue: false,
                duration: ordering.swap_duration,
                easing: "easeInOutQuad",
                complete: DOMswap,
            });
        });
        function DOMswap() {
            const tar1 = $(".assignment-container").eq(tar1_index),
                tar2 = $(".assignment-container").eq(tar2_index);
            const swap_temp = $("<span></span>").insertAfter(tar2);
            tar1.after(tar2);
            swap_temp.after(tar1);
            // swapping on first sort removes pre #animate-in styles
            if (!swap_instantly) {
                tar1.removeAttr("style");
                tar2.removeAttr("style");
                $(document).dequeue();
            }
            swap_temp.remove();
        }
    },
    insert: function(tar1_index, tar2_index, insert_instantly=false) {
        if (tar1_index === tar2_index) return;
        if (insert_instantly) {
            const tar1 = $(".assignment-container").eq(tar1_index),
                tar2 = $(".assignment-container").eq(tar2_index);
            if (tar2_index > tar1_index) {
                tar2.after(tar1);        
            } else {
                tar2.before(tar1);
            }
            return;
        }
        $(document).queue(function() {
            const tar1 = $(".assignment-container").eq(tar1_index),
                tar2 = $(".assignment-container").eq(tar2_index),
                tar1_height = tar1.height() + 10,
                tar2_height = tar2.height() + 10;
            if (tar2_index > tar1_index) {
                tar1.animate({
                    top: tar2.offset().top + tar2_height - tar1.offset().top - tar1_height,
                    marginBottom: "-=" + tar1_height,
                }, {
                    queue: false,
                    duration: ordering.swap_duration,
                    easing: "easeInOutQuad",
                });
                tar2.animate({
                    marginBottom: "+=" + (tar1_height+10),
                }, {
                    queue: false,
                    duration: ordering.swap_duration,
                    easing: "easeInOutQuad",
                    complete: function() {
                        tar2.after(tar1);
                        if (!insert_instantly) {
                            tar1.removeAttr("style");
                            tar2.removeAttr("style");
                            $(document).dequeue();
                        }
                    },
                });
            } else {
                tar1.animate({
                    top: tar2.offset().top + tar2_height - tar1.offset().top - tar1_height*2 /* multiply this becaues of tar2 margin */,
                    marginBottom: "-=" + tar1_height,
                }, {
                    queue: false,
                    duration: ordering.swap_duration,
                    easing: "easeInOutQuad",
                });
                tar2.animate({
                    marginTop: "+=" + (tar1_height+10),
                }, {
                    queue: false,
                    duration: ordering.swap_duration,
                    easing: "easeInOutQuad",
                    complete: function() {
                        tar2.before(tar1);
                        if (!insert_instantly) {
                            tar1.removeAttr("style");
                            tar2.removeAttr("style");
                            $(document).dequeue();
                        }
                    },
                });
            }
        });
    }
}
document.addEventListener("DOMContentLoaded", function() {
    priority.sort({ first_sort: true, ignore_timeout: true });
});