/*
This file includes the code for:

Prioritizing and coloring assignments
Animating assignments that were just created or modified

This only runs on index.html
*/
// THIS FILE HAS NOT YET BEEN FULLY DOCUMENTED
document.addEventListener("DOMContentLoaded", function() {
    sort = function(params /* autofill_override */) {
        if (dat.length === 0) return;
        
        let ordli = [],
            total = 0,
            tomorrow_total = 0,
            incomplete_works = false;
        dat.forEach(function(selected_assignment, index) {

            // Direct copy of loading in data from graph.js
            // Extremely inefficient and hard to maintain
            // Changing this is definitely on my todo list
            // also on todo: remove elses

            // Load in data
            let { ad, x, unit, y, works, dif_assign, skew_ratio, ctime, funct_round, min_work_time, nwd, fixed_mode, dynamic_start, remainder_mode } = selected_assignment;
            ad = parseDate(ad + " 00:00");
            x = Math.round((parseDate(x + " 00:00") - ad) / 86400000);
            ad = new Date(ad);
            y = +y;
            skew_ratio = +skew_ratio;
            ctime = +ctime;
            funct_round = +funct_round;
            min_work_time /= ctime;
            nwd = nwd.map(Number);
            function c_pset(x2, y2) {
                const context = {
                    x: x,
                    y: y,
                    len_nwd: len_nwd,
                    nwd: nwd,
                    assign_day_of_week: assign_day_of_week,
                    y_mod_funct_round: y_mod_funct_round,
                    funct_round: funct_round,
                    min_work_time: min_work_time,
                    min_work_time_funct_round: min_work_time_funct_round,
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
                    remainder_mode: remainder_mode,
                }
                return pset(context, x2, y2);
            }
            function c_funct(n, translate) {
                const context = {
                    red_line_start_x: red_line_start_x,
                    len_nwd: len_nwd,
                    mods: mods,
                    return_y_cutoff: return_y_cutoff,
                    y: y,
                    return_0_cutoff: return_0_cutoff,
                    red_line_start_y: red_line_start_y,
                    funct_round: funct_round,
                    min_work_time: min_work_time,
                    a: a,
                    b: b,
                    min_work_time_funct_round: min_work_time_funct_round,
                    cutoff_to_use_round: cutoff_to_use_round,
                    cutoff_transition_value: cutoff_transition_value,
                    remainder_mode: remainder_mode,
                    y_mod_funct_round: y_mod_funct_round,
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
            let red_line_start_x = fixed_mode ? 0 : dynamic_start,
                red_line_start_y = fixed_mode ? 0 : works[red_line_start_x - dif_assign];
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
            let len_works = works.length - 1,
                y_mod_funct_round = (y - red_line_start_y) % funct_round,
                ignore_ends_mwt = ignore_ends && min_work_time,
                len_nwd = nwd.length,
                unit_is_minute = pluralize(unit, 1).toLowerCase() === "minute",
                min_work_time_funct_round = min_work_time ? Math.ceil(min_work_time / funct_round) * funct_round : funct_round;
            let due_date = new Date(ad.valueOf());
            due_date.setDate(due_date.getDate() + x);
            let mods,
                assign_day_of_week = ad.getDay();
            if (len_nwd) {
                mods = c_calc_mod_days();
            }
            let lw = works[len_works];
            let a, b, cutoff_transition_value, cutoff_to_use_round, return_y_cutoff, return_0_cutoff;
            ({ a, b, skew_ratio, cutoff_transition_value, cutoff_to_use_round, return_y_cutoff, return_0_cutoff } = c_pset());

            // Will document soon
            let daysleft = Math.round((new Date(new Date().toDateString()) - ad) / 86400000),
                todo = c_funct(len_works+dif_assign+1) - lw;
            const today_minus_dac = daysleft - dif_assign;
            const assignmentIsInProgress = () => today_minus_dac === len_works - 1 && c_funct(len_works + dif_assign) > lw && !nwd.includes(new Date().getDay());
            let strdaysleft, status_value, status_message;
            if (daysleft < 0) {
                status_message = '#\u3000This Assignment has Not been Assigned Yet! Please wait until it is.';
                if (daysleft === -1) {
                   strdaysleft = 'Assigned Tomorrow';
                } else if (daysleft > -7) {
                   strdaysleft = `Assigned on ${ad.toLocaleDateString("en-US", {weekday: 'long'})}`;
                } else {
                   strdaysleft = `Assigned in ${-daysleft}d`;
                }
                status_value = 5;
            } else if (lw >= y || x - daysleft < 1) {
                status_message = '*\u3000You have Finished this Assignment!';
                status_value = 6;
                if (-(x - daysleft)) {
                    strdaysleft = `${-(x - daysleft)}d Ago`;
                } else {
                    strdaysleft = "Today";
                }
            } else {
                if (today_minus_dac > len_works) {
                    let has_autofilled = false;
                    for (i = 0; i < today_minus_dac-len_works; i++) {
                        if (has_autofilled) {
                            todo = c_funct(len_works+dif_assign+1) - lw;
                        }
                        const autofill_this_loop = params.autofill_override || todo <= 0 || nwd.includes((assign_day_of_week + len_works + dif_assign) % 7);
                        if (!autofill_this_loop || len_works + dif_assign === x - 1) {
                            break;
                        }
                        has_autofilled = true;
                        works.push(lw);
                        len_works++;
                        if (todo) {
                            dynamic_start = len_works + dif_assign;
                            if (!fixed_mode) {
                                red_line_start_x = dynamic_start;
                                red_line_start_y = works[red_line_start_x - dif_assign];
                                y_mod_funct_round = (y - red_line_start_y) % funct_round;
                                if (len_nwd) {
                                    mods = c_calc_mod_days();
                                }
                                ({ a, b, skew_ratio, cutoff_transition_value, cutoff_to_use_round, return_y_cutoff, return_0_cutoff } = c_pset());
                            }
                        }
                    }
                    if (has_autofilled) {
                        selected_assignment.dynamic_start = dynamic_start;
                        todo = c_funct(len_works+dif_assign+1) - lw;
                    }
                }
                daysleft = x - daysleft;
                if (today_minus_dac > len_works && len_works + dif_assign < x) {
                    status_message = '?\u3000Whoops! You have not Entered in your Work Completed from Previous Days!';
                    status_value = 1;
                } else if (!assignmentIsInProgress() && (todo <= 0 || today_minus_dac < len_works) || nwd.includes(new Date().getDay()) && daysleft !== 1) {
                    status_message = '\u2714\u3000Nice Job! You are Finished with this Assignment for Today. Keep it up!';
                    status_value = 4;
                } else {
                    status_value = 3;
                    if (assignmentIsInProgress()) {
                        status_message = "@\u3000This Assignment's Daily Work is in Progress!";
                        todo = c_funct(len_works+dif_assign) - lw;
                    } else if (len_works > 0 && (lw - works[-2]) / warning_acceptance * 100 < c_funct(len_works + dif_assign) - works[-2]) {
                        status_message = '!\u3000Warning! You are behind your Work schedule!';
                    } else {
                        status_message = "\u2718\u3000This Assignment's Daily Work is Unfinished!";
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
                    strdaysleft = due_date.toLocaleDateString("en-US", {weekday: 'long'});
                } else {
                    strdaysleft = `${daysleft}d`;
                }
            }
            let status_priority;
            if ([1,5,6].includes(status_value)) {
                status_priority = Math.abs(daysleft);
            } else {
                skew_ratio = 1;
                red_line_start_x = dif_assign;
                red_line_start_y = works[0];
                if (len_nwd) {
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
                                sum_diff_red_blue += works[i] - c_funct(i);
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
            ordli.push([status_value, -status_priority, index]);
            $(".status").eq(index).html(status_message);
            $(".title").eq(index).attr("data-daysleft", strdaysleft);

        });   
    }
    sort({autofill_override: false});
    // Returns color rgb from priority percentage
    function color(p) {
        return `rgb(${132+94*p},${200-109*p},${65+15*p})`;
    }
    const k = [1,0.95,0.9,0.85,0.8,0.75,0.7,0.65,0.6,0.55,0.5,0.45,0.4,0.35,0.3,0.25,0.2,0.15,0.1,0.05,0,0,0];
    swap = function(a1, a2) {
        // Queues each swap
        $(document).queue(function() {
            const all = $(".assignment-container"),
                tar1 = all.eq(a1),
                tar2 = all.eq(a2),
                tar1_height = tar1.height() + 10,
                tar2_height = tar2.height() + 10;

            // Deal with existing assingment margin
            // Don't really know how this works but it makes the swap transition more smooth
            if (tar1_height > tar2_height) {
                tar2.css("margin-top", 10);
            } else {
                tar1.css("margin-bottom", 10);
            }
            const swap_duration = 2000;
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
                complete: function() {
                    const swap_temp = $("<span></span>").insertAfter(tar2);
                    tar1.after(tar2);
                    swap_temp.after(tar1);
                    tar1.removeAttr("style");
                    tar2.removeAttr("style");
                    swap_temp.remove();
                    $(document).dequeue();
                },
            });
        });
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
    function color_or_animate_assignment($assignment, index, is_element_submitted=false) {
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
            $assignment.css("background", color(k[index]));
        }
        if (text_priority) {
            $assignment.find(".title").attr("data-priority",`Priority: ${k[index]*100}%`);
        }
    }
    // The rest of the code auto scrolls to the assignment and then runs color_or_animate_assignment() on it only when it finishes scrolling
    $(".assignment").each(function(index) {
        const assignment_container = $(this).parent();
        if (assignment_container.is("#animate-color, #animate-in")) {
            // If the iterated assignment is the one that was created or modified, run this
            if ($("#animate-in").length) {
                // Set initial transition values for "#animate-in"
                assignment_container.css({
                    // 20+ and -10 deals with top and bottom margins
                    "top": 20+$("#assignments-container").offset().top + $("#assignments-container").height() - assignment_container.offset().top,
                    "opacity": "0",
                    "margin-bottom": -assignment_container.height()-10,
                });
            }
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
                        // scrollIntoView sometimes doesn't work without setTimeour
                        assignment_to_scroll_to[0].scrollIntoView({
                            behavior: 'smooth',
                            block: 'nearest',
                        });
                    }, 0);
                    // The scroll function determines when the page has stopped scrolling and internally resolves the promise via "resolver"
                    resolver = resolve;
                    $("main").scroll(scroll);
                    scroll();
                });
            }).then(() => color_or_animate_assignment($(this), index, true)); // Arrow function to preserve "this"
        } else {
            // If the assignment iterated isn't the one that was created or modified, color it instantly
            color_or_animate_assignment($(this), index);
        }
    });
});
// Make these global because other files use scroll()
let scrollTimeout, resolver;
function scroll() {
    clearTimeout(scrollTimeout);
    // Runs when scroll ends
    scrollTimeout = setTimeout(function() {
        $("main").off('scroll');
        // Resolves promise from the scope it is called in
        resolver();
    }, 200);
}