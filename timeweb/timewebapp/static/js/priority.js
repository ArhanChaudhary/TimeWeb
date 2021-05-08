/*
This file includes the code for:

Prioritizing, swapping, and coloring assignments
Animating assignments that were just created or modified

This only runs on index.html
*/
// THIS FILE HAS NOT YET BEEN FULLY DOCUMENTED
document.addEventListener("DOMContentLoaded", function() {
    const swap_duration = 1000;
    swap = function(tar1_index, tar2_index, swap_instantly=false) {
        // Queues each swap
        if (tar1_index === tar2_index) return;
        if (swap_instantly) {
            const tar1 = $(".assignment-container").eq(tar1_index),
                tar2 = $(".assignment-container").eq(tar2_index);
            DOMswap(tar1, tar2);
            return;
        }
        $(document).queue(function() {
            const tar1 = $(".assignment-container").eq(tar1_index),
                tar2 = $(".assignment-container").eq(tar2_index),
                tar1_height = tar1.height() + 10,
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
                duration: swap_duration,
                easing: "easeInOutQuad",
            });

            tar2.animate({
                bottom: tar2.offset().top - tar1.offset().top,
                marginTop: "+=" + (tar1_height - tar2_height),
            }, {
                queue: false,
                duration: swap_duration,
                easing: "easeInOutQuad",
                complete: () => DOMswap(tar1, tar2),
            });
        });
        function DOMswap(tar1, tar2) {
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
    }
    insert = function(tar1_index, tar2_index, insert_instantly=false) {
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
                    duration: swap_duration,
                    easing: "easeInOutQuad",
                });
                tar2.animate({
                    marginBottom: "+=" + (tar1_height+10),
                }, {
                    queue: false,
                    duration: swap_duration,
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
                    top: tar2.offset().top + tar2_height - tar1.offset().top - tar1_height*2 /*multiply this becaues the tar2 margin cancels this out*/,
                    marginBottom: "-=" + tar1_height,
                }, {
                    queue: false,
                    duration: swap_duration,
                    easing: "easeInOutQuad",
                });
                tar2.animate({
                    marginTop: "+=" + (tar1_height+10),
                }, {
                    queue: false,
                    duration: swap_duration,
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
    let sortTimeout;
    sort = function(params={}) {
        clearTimeout(sortTimeout);
        if (params.ignore_timeout) {
            sort_without_timeout();
        } else {
            sortTimeout = setTimeout(sort_without_timeout, swap_duration + 500);
        }
        function sort_without_timeout() {
            let ordered_assignments = [],
                total = 0,
                tomorrow_total = 0,
                incomplete_works = false;
            $(".assignment").each(function(index) {

                // Direct copy of loading in data from graph.js
                // Extremely inefficient and hard to maintain
                // Changing this is definitely on my todo list
                // also on todo: remove elses
                let sa = load_assignment_data($(this));
                let { ad, x, unit, y, dif_assign, skew_ratio, ctime, funct_round, min_work_time, nwd } = sa;
                ad = parseDate(ad + " 00:00");
                x = Math.round((parseDate(x + " 00:00") - ad) / 86400000);
                ad = new Date(ad);
                y = +y;
                skew_ratio = +skew_ratio;
                ctime = +ctime;
                funct_round = +funct_round;
                min_work_time /= ctime;
                nwd = nwd.map(Number);
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

                        // wCon: wCon,
                        // hCon: hCon,
                        // skew_ratio_lim: skew_ratio_lim,
                        // height: height,
                        // set_skew_ratio: set_skew_ratio,
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
                let daysleft = Math.round((new Date(new Date().toDateString()) - ad) / 86400000),
                    todo = c_funct(len_works+dif_assign+1) - lw;
                const today_minus_dac = daysleft - dif_assign;
                const assignmentIsInProgress = () => today_minus_dac === len_works - 1 && c_funct(len_works + dif_assign) > lw && !nwd.includes(new Date().getDay());
                let strdaysleft, status_value, status_message;
                if (daysleft < 0) {
                    status_message = '#\u3000 This Assignment has Not Yet been Assigned';
                    if (daysleft === -1) {
                    strdaysleft = 'Assigned Tomorrow';
                    } else if (daysleft > -7) {
                    strdaysleft = `Assigned on ${ad.toLocaleDateString("en-US", {weekday: 'long'})}`;
                    } else {
                    strdaysleft = `Assigned in ${-daysleft}d`;
                    }
                    status_value = 5;
                } else if (lw >= y || x - daysleft < 1) {
                    status_message = '&#9733;\u3000You have Finished this Assignment';
                    status_value = 6;
                    strdaysleft = '';
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
                            SendAttributeAjax("works", sa.works.map(String), sa.id);
                            SendAttributeAjax("dynamic_start", sa.dynamic_start, sa.id);
                            todo = c_funct(len_works+dif_assign+1) - lw;
                        }
                    }
                    daysleft = x - daysleft;
                    if (today_minus_dac > len_works && len_works + dif_assign < x) {
                        status_message = '?\u3000  You have not Entered your past Work Inputs!';
                        status_value = 1;
                        incomplete_works = true;
                    } else if (!assignmentIsInProgress() && (todo <= 0 || today_minus_dac < len_works) || nwd.includes(new Date().getDay()) && daysleft !== 1) {
                        status_message = '\u2714\u3000Nice Job! You are Finished with this Assignment for Today';
                        status_value = 4;
                    } else {
                        status_value = 3;
                        display_format_minutes = true;
                        if (assignmentIsInProgress()) {
                            status_message = "@\u3000This Assignment's Daily Work is in Progress";
                            todo = c_funct(len_works+dif_assign) - lw;
                        } else if (len_works && (lw - sa.works[len_works - 1]) / warning_acceptance * 100 < c_funct(len_works + dif_assign) - sa.works[len_works - 1]) {
                            status_message = '!\u3000 Warning! You are behind your Work schedule!';
                        } else {
                            status_message = "\u2718\u3000This Assignment's Daily Work is Unfinished";
                        }
                        if (unit_is_minute) {
                            status_message += `<br>Complete ${todo} ${pluralize(unit,todo)} of Work Today`;
                        } else {
                            status_message += `<br>Complete ${todo} ${pluralize(unit,todo)} Today`;
                        }
                        total += Math.ceil(todo*ctime);
                    }
                    if (daysleft === 1) {
                        strdaysleft = 'Tomorrow';
                        tomorrow_total += Math.ceil(todo*ctime);
                        if (status_value !== 1) {
                            status_value = 2;
                        }
                    } else if (daysleft < 7) {
                        const due_date = new Date(ad.valueOf());
                        due_date.setDate(due_date.getDate() + x);
                        strdaysleft = due_date.toLocaleDateString("en-US", {weekday: 'long'});
                    } else {
                        strdaysleft = `${daysleft}d`;
                    }
                }
                if (status_value === 6) {
                    $(".assignment-container").eq(index).addClass("finished");
                } else {
                    $(".assignment-container").eq(index).removeClass("finished");
                }
                let status_priority;
                if ([1,5,6].includes(status_value)) {
                    status_priority = Math.abs(daysleft);
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
                    } else {
                        if (len_works && daysleft !== -1) {
                            // more readable and faster than Array.prototype.reduce
                            let sum_diff_red_blue = 0;
                            for (i = 0; i <= len_works; i++) {
                                if (!nwd.includes(assign_day_of_week + i - 1)) {
                                    // No need to worry about c_funct(i + dif_assign) being before dynamic_start because red_line_start_x is set to dif_assign
                                    sum_diff_red_blue += sa.works[i] - c_funct(i + dif_assign);
                                }
                            }
                            const how_well_followed_const = 1-sum_diff_red_blue/len_works/y;
                            status_priority = how_well_followed_const*todo*ctime/(x-dif_assign-len_works);
                        } else {
                            status_priority = todo*ctime/(x-dif_assign-len_works);
                        }
                        if (status_priority < 0) {
                            status_priority = 0;
                        }
                    }
                }
                ordered_assignments.push([status_value, status_priority, index]);
                $(".status-message").eq(index).html(status_message);
                $(".title").eq(index).attr("data-daysleft", strdaysleft);
                if (display_format_minutes) {
                    $(".completion-time").eq(index).html(format_minutes(todo * ctime));
                } else {
                    $(".completion-time").eq(index).html('');
                }
            });
            ordered_assignments.sort(function(a, b) {
                if (a[0] < b[0]) return -1;
                if (a[0] > b[0]) return 1;

                // Sort from max to min
                if (a[1] < b[1]) return 1;
                if (a[1] > b[1]) return -1;

                if (a[2] < b[2]) return -1;
                if (a[2] > b[2]) return 1;
            });
            const highest_priority = Math.max(...Array.from(ordered_assignments, function(assignment) {
                if (assignment[0] === 2 || assignment[0] === 3) {
                    return assignment[1];
                } else {
                    return -Infinity;
                }
            }));
            for (let assignment of ordered_assignments) {
                const sa = $(".assignment").eq(assignment[2]);
                let priority;
                if (assignment[0] === 1) {
                    priority = NaN;
                } else if (assignment[0] === 4 || assignment[0] === 6 || assignment[0] === 5 /* Last part needed for "This assignment has not yet been assigned" being set to color() values greater than 1 */) {
                    priority = 0;
                } else {
                    priority = Math.max(1,Math.floor(assignment[1] / highest_priority * 100 + 1e-10));
                }
                if (text_priority) {
                    if (assignment[0] === 2 || assignment[0] === 3) {
                        $(".title").eq(assignment[2]).attr("data-priority", `Priority: ${priority}%`);               
                    } else {
                        $(".title").eq(assignment[2]).attr("data-priority", "");       
                    }
                }
                const assignment_container = sa.parent();
                if (params.first_sort && assignment_container.is("#animate-color, #animate-in")) {
                    new Promise(function(resolve) {
                        $(window).one('load', function() {
                            // Since "#animate-in" will have a bottom margin of negative its height, the next assignment will be in its final position at the start of the animation
                            // So, scroll to the next assignment instead
                            let assignment_to_scroll_to = $("#animate-in").next();
                            if (!assignment_to_scroll_to.length) {
                                // If "#animate-color" or "#animate-in" is the last assignment on the list, scroll to itself instead
                                assignment_to_scroll_to = assignment_container;
                            }
                            setTimeout(function() {
                                // scrollIntoView sometimes doesn't work without setTimeout
                                assignment_to_scroll_to[0].scrollIntoView({
                                    behavior: 'smooth',
                                    block: 'nearest',
                                });
                            }, 0);
                            // The scroll function determines when the page has stopped scrolling and internally resolves the promise via "resolver"
                            $("main").scroll(() => scroll(resolve));
                            scroll(resolve);
                        });
                    }).then(() => color_or_animate_assignment(sa, priority/100, true, params.first_sort));
                } else {
                    color_or_animate_assignment(sa, priority/100, false, params.first_sort);
                }
            }
            // Have this after above to preserve index on sa
            for (let [index, assignment] of ordered_assignments.entries()) {
                if (index !== assignment[2]) {
                    swap(index, assignment[2], params.first_sort);
                    ordered_assignments.find(sa => sa[2] === index)[2] = assignment[2] // Adjust index of assignment that used to be there 
                    assignment[2] = index;// Adjust index of current swapped assignment
                }
            }
            if (incomplete_works) {
                $("#estimated-total-time").html('Please enter your past inputs');
                $("#current-time, #tomorrow-time").hide();
            } else if (!total) {
                $("#estimated-total-time").html(dat.length ? 'You have Finished everything for Today!' : 'You don\'t have any Assignments');
                $("#current-time, #tomorrow-time").hide();
                $("#hide-button").css("visibility", "hidden"); // Preserve layout positioning
            } else {
                $("#estimated-total-time").html(format_minutes(total)).attr("data-minutes", total);
                $("#tomorrow-time").html(` (${tomorrow_total === total ? "All" : format_minutes(tomorrow_total)} due Tomorrow)`)
                $("#current-time, #tomorrow-time").show();
                $("#hide-button").css("visibility", "");
            }
            displayClock();
        }
    }
    sort({ first_sort: true, ignore_timeout: true });
    if ($("#animate-in").length) {
        // Set initial transition values for "#animate-in"
        // Needs to be after domswap or else "top" bugs about 
        $("#animate-in").css({
            // 20+ and -10 deals with top and bottom margins
            "top": 20+$("#assignments-container").offset().top + $("#assignments-container").height() - $("#animate-in").offset().top,
            "opacity": "0",
            "margin-bottom": -$("#animate-in").height()-10,
        });
    }
    // Returns color rgb from priority percentage
    function color(p) {
        if (isNaN(p)) {
            return "";
        } else {
            return `rgb(${132+94*p},${200-109*p},${65+15*p})`;
        } 
    }
    // 
    // Handles animating assignments that were just created or modified and coloring
    //

    // A bit of context: the backend puts "#animate-in" to an assignment that was just created and "#animate-color" to an assignment that was just modified, and only one of these will exist at a time

    // If an assignment was just modified, I want it to be scrolled to and then change color from white to its priority color

    // If an assignment was just created, I want it to be scrolled to and then fade and ease in from the bottom, also animating making room for it in the list
    // This is done by setting its bottom margin to the negative value of its height, effectively making it seem like it's not there
    // Then, the assignment is moved to the bottom of the page and hidden by using the "top" and "opacity" styles
    // Finally, they are all set to their default values in a jQuery animation in the function directly below this
    function color_or_animate_assignment($assignment, priority, is_element_submitted, color_instantly) {
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
                $assignment.css("background", color(priority));
                $assignment[0].offsetHeight;
                $assignment.removeClass("color-instantly");
            } else {
                $assignment.css("background", color(priority));
            }
        }
    }
});