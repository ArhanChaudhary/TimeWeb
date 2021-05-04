/* 
This file includes the code for:

Transitioning the opening and closing of assignments
Drawing the graph
The graph's buttons and inputs

This only runs on index.html
*/

//
// THIS FILE HAS NOT YET BEEN FULLY DOCUMENTED
//

$(function() {
    // scale and font_size is the same for every graph
    let scale, // resolution of the graph
        font_size, // font size of the central text in the graph
        width, // Dimensions of each assignment
        height; // Dimensions of each assignment

    function PreventArrowScroll(e) {
        // Prevent arrow keys from scrolling when clicking the up or down arrows in the graph
        var e = e || window.event;
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
        }
    }
    ignore_queue = false;
    $(".assignment").click(function(e) {
        var e = e || window.event;
        // Runs the click function if
        // There is no other assignment being animated (ignored with ignore_queue=true)
        // The background of the assignment was clicked
        // The footer wasn't clicked (to prevent accidental closing)
        if ((ignore_queue || $(document).queue().length === 0) && !["IMG", "BUTTON", "CANVAS", "INPUT"].includes(e.target.tagName) && !$(e.target).hasClass("graph-footer")) {
            // Runs if no assignments are swapping and the element clicked was the assignment background
            let assignment = $(this);
            const graph_container = assignment.find(".graph-container"),
                not_first_click = assignment.data('not_first_click');
            if (graph_container.attr("style") && assignment.hasClass("open-assignment")) {
                // Runs when assignment is clicked while open

                // Animate the graph's margin bottom to close the assignment
                graph_container.animate({
                    marginBottom: -graph_container.height()
                }, 750, "easeOutCubic", function() {
                    // Hide graph when transition ends
                    assignment.css("overflow", "");
                    graph_container.removeAttr("style")
                        // Used in form.js to resolve a promise to transition deleting the assignment
                        .trigger("transitionend");
                });
                // Begin arrow animation
                this.querySelector(".fallingarrowanimation").beginElement();
                // Make assignment overflow hidden 
                assignment.removeClass("open-assignment").css("overflow", "hidden");
                // If no graphs are open, allow arrow scroll
                if ($(".open-assignment").length === 0) {
                    $(document).off("keydown", PreventArrowScroll);
                }
            } else {
                // If the assignment was clicked while it was closing, stop the closing animation and open it
                graph_container.stop();
                assignment.css("overflow", "");
                graph_container.css({
                    "display": "",
                    "margin-bottom": ""
                });
                // Prevents auto scroll if a graph is open
                if ($(".open-assignment").length === 0) {
                    $(document).keydown(PreventArrowScroll);
                }
                // Make graph visible
                graph_container.css("display", "block");
                let graph = this.querySelector('.graph'),
                    fixed_graph = this.querySelector('.fixed-graph');
                // Disable hover
                assignment.addClass("open-assignment");
                // Animate arrow
                this.querySelector(".risingarrowanimation").beginElement();
                let sa = load_assignment_data(assignment);
                // Load in static data
                let { ad, x, unit, y, dif_assign, skew_ratio, ctime, funct_round, min_work_time, nwd } = sa;
                // Type conversions
                ad = parseDate(ad + " 00:00");
                x = Math.round((parseDate(x + " 00:00") - ad) / 86400000); // Round to account for DST
                ad = new Date(ad);
                y = +y;
                // dif assign is already an int
                skew_ratio = +skew_ratio;
                ctime = +ctime;
                funct_round = +funct_round;
                // Converts min_work_time to int if string or null
                min_work_time /= ctime;
                nwd = nwd.map(Number);
                // dynamic start is already an int
                
                let red_line_start_x = sa.fixed_mode ? 0 : sa.dynamic_start, // X-coordinate of the start of the red line
                    red_line_start_y = sa.fixed_mode ? 0 : sa.works[red_line_start_x - dif_assign]; // Y-coordinate of the start of the red line
                // Not sure if these if stataments are actually needed (except for the last one), but I included them in the original program, and there doesnt seem to be any harm
                // Caps values
                if (funct_round > y - red_line_start_y) {
                    funct_round = y - red_line_start_y;
                }
                if (min_work_time > y - red_line_start_y) {
                    min_work_time = y - red_line_start_y;
                }
                if (min_work_time <= funct_round) {
                    min_work_time = 0;
                // Suppose funct_round is 4, min_work_time is 5, f(4) = 18, and f(5) = 23
                // f(4) gets rounded to 20 and f(5) gets rounded to 24, violating the min_work_time of 5
                // This fixes the problem
                } else if (funct_round < min_work_time && min_work_time < 2 * funct_round) {
                    min_work_time = funct_round * 2;
                }
                let len_works = sa.works.length - 1,
                    lw = sa.works[len_works],
                    ignore_ends_mwt = ignore_ends && min_work_time, // ignore_ends only when min_work_time is also enabled
                    set_skew_ratio = false, // Bool to manually set skew ratio on graph
                    unit_is_minute = pluralize(unit, 1).toLowerCase() === "minute",
                    last_mouse_x,
                    last_mouse_y,
                    wCon,
                    hCon;
                // Due date
                let due_date = new Date(ad.valueOf());
                due_date.setDate(due_date.getDate() + x);
                // Enable draw_point by default, which determines whether to draw the point on the graph
                let draw_point = true;
                // Handles not working days, explained later
                let mods,
                    assign_day_of_week = ad.getDay(); // Used with mods
                if (nwd.length) {
                    mods = c_calc_mod_days();
                }
                // Sets the upper and lower caps for skew_ratio
                let skew_ratio_lim;
                set_skew_ratio_lim();
                if (skew_ratio > skew_ratio_lim) {
                    skew_ratio = skew_ratio_lim;
                } else if (skew_ratio < 2 - skew_ratio_lim) {
                    skew_ratio = 2 - skew_ratio_lim;
                }
                // Whether or not to display the year
                let date_string_options, date_string_options_no_weekday;
                if (ad.getFullYear() === due_date.getFullYear()) {
                    date_string_options = {month: 'long', day: 'numeric', weekday: 'long'};
                    date_string_options_no_weekday = {month: 'long', day: 'numeric'};
                } else {
                    date_string_options = {year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'};
                    date_string_options_no_weekday = {year: 'numeric', month: 'long', day: 'numeric'};
                }
                let date_assignment_created = new Date(ad.valueOf());
                date_assignment_created.setDate(date_assignment_created.getDate() + dif_assign);
                // Days between today and date_assignment_created
                let today_minus_dac = Math.round((new Date(new Date().toDateString()) - date_assignment_created) / 86400000),
                    // Days between today and the assignment date
                    today_minus_ad = Math.round((new Date(new Date().toDateString()) - ad) / 86400000);
                let a, b, /* skew_ratio has already been declared */ cutoff_transition_value, cutoff_to_use_round, return_y_cutoff, return_0_cutoff;
                ({ a, b, skew_ratio, cutoff_transition_value, cutoff_to_use_round, return_y_cutoff, return_0_cutoff } = c_pset());
                const assignmentIsInProgress = () => today_minus_dac === len_works - 1 && c_funct(len_works + dif_assign) > lw && !nwd.includes(new Date().getDay());
                day = len_works - assignmentIsInProgress();
                function c_pset(x2, y2) {
                    const context = {
                        x: x,
                        y: y,
                        nwd: nwd,
                        assign_day_of_week: assign_day_of_week,
                        funct_round: funct_round,
                        min_work_time: min_work_time,
                        ignore_ends_mwt: ignore_ends_mwt,

                        wCon: wCon,
                        hCon: hCon,
                        skew_ratio_lim: skew_ratio_lim,
                        height: height,
                        set_skew_ratio: set_skew_ratio,
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
                
                function set_skew_ratio_lim() {
                    const y1 = y - red_line_start_y;
                    if (!y1) {
                        skew_ratio_lim = 0;
                    } else {
                        let x1 = x - red_line_start_x;
                        if (nwd.length) {
                            x1 -= Math.floor(x1 / 7) * nwd.length + mods[x1 % 7];
                        }
                        /*
                        skew_ratio = (a + b) * x1 / y1;
                        skew_ratio = funct(1) * x1 / y1;
                        skew_ratio = (y1+min_work_time_funct_round) * x1 / y1;
                        */
                        const min_work_time_funct_round = min_work_time ? Math.ceil(min_work_time / funct_round) * funct_round : funct_round; // LCM of min_work_time and funct_round
                        skew_ratio_lim = Math.round((y1 + min_work_time_funct_round) * x1 / y1 * 10)/10;
                    }
                    assignment.find(".skew-ratio-textbox").attr({
                        min: 1 - skew_ratio_lim,
                        max: skew_ratio_lim - 1,
                    });
                }
                //
                // Draw graph
                //
                function draw(x2 = false, y2 = false) {
                    const actually_draw_point = draw_point && x2 !== false;
                    if (actually_draw_point) {
                        // Cant pass in mouse_x and mouse_y as x2 and y2 because mouse_y becomes a bool
                        // -53.7 and -44.5 were used instead of -50 because I experimented those to be the optimal positions of the graph coordinates
                        var mouse_x = Math.round((x2 - 53.7) / wCon),
                            mouse_y = (height - y2 - 44.5) / hCon;
                        if (mouse_x < Math.min(red_line_start_x, dif_assign)) {
                            mouse_x = Math.min(red_line_start_x, dif_assign);
                        } else if (mouse_x > x) {
                            mouse_x = x;
                        }
                        if (dif_assign <= mouse_x && mouse_x <= len_works + dif_assign) {
                            if (mouse_x < red_line_start_x) {
                                mouse_y = true;
                            } else {
                                mouse_y = Math.abs(mouse_y - c_funct(mouse_x)) > Math.abs(mouse_y - sa.works[mouse_x - dif_assign]);
                            }
                        } else {
                            mouse_y = false;
                        }
                        if (!set_skew_ratio && last_mouse_x === mouse_x && last_mouse_y === mouse_y) {
                            return;
                        }
                        last_mouse_x = mouse_x; last_mouse_y = mouse_y;
                    }
                    ({ a, b, skew_ratio, cutoff_transition_value, cutoff_to_use_round, return_y_cutoff, return_0_cutoff } = c_pset(x2, y2));

                    const screen = graph.getContext("2d");
                    screen.scale(scale, scale);
                    screen.clearRect(0, 0, width, height);
                    let move_info_down,
                        todo = c_funct(day+dif_assign+1);
                    if (show_progress_bar) {
                        move_info_down = 0;
                        let should_be_done_x = width - 155 + todo / y * 146,
                            bar_move_left = should_be_done_x - width + 17;
                        if (bar_move_left < 0 || x <= today_minus_ad || lw >= y) {
                            bar_move_left = 0
                        } else if (should_be_done_x > width - 8) {
                            bar_move_left = width - 8;
                        }
                        // bar move left
                        screen.fillStyle = "rgb(55,55,55)";
                        screen.fillRect(width-155-bar_move_left,height-121,148,50);
                        screen.fillStyle = "lime";
                        screen.fillRect(width-153-bar_move_left,height-119,144,46);

                        screen.fillStyle = "rgb(0,128,0)";
                        const slash_x = width - 142 - bar_move_left;
                        screen.beginPath();
                        screen.moveTo(slash_x,height-119);
                        screen.lineTo(slash_x+15,height-119);
                        screen.lineTo(slash_x+52.5,height-73);
                        screen.lineTo(slash_x+37.5,height-73);
                        screen.fill();
                        screen.beginPath();
                        screen.moveTo(slash_x+35,height-119);
                        screen.lineTo(slash_x+50,height-119);
                        screen.lineTo(slash_x+87.5,height-73);
                        screen.lineTo(slash_x+72.5,height-73);
                        screen.fill();
                        screen.beginPath();
                        screen.moveTo(slash_x+70,height-119);
                        screen.lineTo(slash_x+85,height-119);
                        screen.lineTo(slash_x+122.5,height-73);
                        screen.lineTo(slash_x+107.5,height-73);
                        screen.fill();

                        screen.textAlign = "center";
                        screen.fillStyle = "black";
                        screen.font = '13.75px Open Sans';
                        screen.textBaseline = "top";
                        if (x > today_minus_ad && lw < y) {
                            screen.fillText(`Your Progress: ${Math.floor(lw/y*100)}%`, width-81, height-68);
                            const done_x = width-153+lw/y*144-bar_move_left;
                            screen.fillStyle = "white";
                            screen.fillRect(done_x, height-119, width-9-bar_move_left-done_x, 46);
                            if (should_be_done_x >= width - 153) {
                                screen.fillStyle = "black";
                                if (should_be_done_x > width - 17) {
                                    should_be_done_x = width - 17;
                                }
                                screen.rotate(Math.PI / 2);
                                // Since rotate, swap x and y, make x negative
                                screen.fillText("Goal", height-95, -should_be_done_x-14);
                                screen.rotate(-Math.PI / 2);
                                screen.fillStyle = "rgb(55,55,55)";
                                screen.fillRect(should_be_done_x, height-119, 2, 46);
                            }
                        } else {
                            screen.fillText("Completed!", width-81-bar_move_left, height-68);
                        }
                    } else {
                        move_info_down = 72;
                    }
                    let radius = wCon / 3;
                    if (radius > 3) {
                        radius = 3;
                    } else if (radius < 2) {
                        radius = 2;
                    }
                    let circle_x,
                        circle_y,
                        line_end = x + Math.ceil(1 / wCon);
                    screen.strokeStyle = "rgb(233,68,46)"; // red
                    screen.lineWidth = radius;
                    screen.beginPath();
                    for (let point = red_line_start_x; point < line_end; point += Math.ceil(1 / wCon)) {
                        circle_x = point * wCon + 50;
                        if (circle_x > width - 5) {
                            circle_x = width - 5;
                        }
                        circle_y = height - c_funct(point) * hCon - 50;
                        screen.lineTo(circle_x - (point === red_line_start_x) * radius / 2, circle_y); // (point===0)*radius/2 makes sure the first point is filled in properly
                        screen.arc(circle_x, circle_y, radius, 0, 2 * Math.PI);
                        screen.moveTo(circle_x, circle_y);
                    }
                    screen.stroke();
                    screen.beginPath();
                    radius *= 0.75;
                    if (len_works + Math.ceil(1 / wCon) < line_end) {
                        line_end = len_works + Math.ceil(1 / wCon);
                    }
                    screen.strokeStyle = "rgb(1,147,255)"; // blue
                    screen.lineWidth = radius;
                    for (let point = 0; point < line_end; point += Math.ceil(1 / wCon)) {
                        circle_x = (point + dif_assign) * wCon + 50;
                        if (point > len_works) {
                            circle_y = height - sa.works[len_works] * hCon - 50;
                        } else {
                            circle_y = height - sa.works[point] * hCon - 50;
                        }
                        screen.lineTo(circle_x - (point === 0) * radius / 2, circle_y);
                        screen.arc(circle_x, circle_y, radius, 0, 2 * Math.PI);
                        screen.moveTo(circle_x, circle_y);
                    }
                    radius /= 0.75;
                    screen.stroke();
                    screen.textBaseline = "top";
                    screen.textAlign = "start";
                    screen.font = font_size + 'px Open Sans';
                    if (actually_draw_point) {
                        let funct_mouse_x;
                        if (mouse_y) {
                            funct_mouse_x = sa.works[mouse_x - dif_assign];
                        } else {
                            funct_mouse_x = c_funct(mouse_x).toFixed(6).replace(/\.?0*$/, '');
                        }
                        let str_mouse_x = new Date(ad);
                        str_mouse_x.setDate(str_mouse_x.getDate() + mouse_x);
                        str_mouse_x = str_mouse_x.toLocaleDateString("en-US", date_string_options_no_weekday);
                        if (wCon * mouse_x + 50 + screen.measureText(`(Day: ${str_mouse_x}, ${pluralize(unit,1)}: ${funct_mouse_x})`).width > width - 5) {
                            screen.textAlign = "end";
                        }
                        if (height - funct_mouse_x * hCon - 50 + screen.measureText(0).width * 2 > height - 50) {
                            screen.textBaseline = "bottom";
                        }
                        screen.fillStyle = "black";
                        screen.fillText(` (Day: ${str_mouse_x}, ${pluralize(unit,1)}: ${funct_mouse_x}) `, wCon * mouse_x + 50, height - funct_mouse_x * hCon - 50);
                        screen.fillStyle = "lime";
                        screen.strokeStyle = "lime";
                        screen.beginPath();
                        screen.arc(wCon * mouse_x + 50, height - funct_mouse_x * hCon - 50, radius, 0, 2 * Math.PI);
                        screen.stroke();
                        screen.fill();
                        screen.fillStyle = "black";
                    }
                    const rounded_skew_ratio = Math.round(1000*(skew_ratio-1))/1000;
                    screen.textAlign = "end";
                    screen.fillStyle = "black";
                    screen.textBaseline = "top";
                    screen.font = '13.75px Open Sans';
                    screen.fillText(sa.fixed_mode ? "Fixed Mode" : "Dynamic Mode", width-2, height-155+move_info_down);
                    screen.fillText(`Skew Ratio: ${rounded_skew_ratio} (${rounded_skew_ratio ? "Parabolic" : "Linear"})`, width-2, height-138+move_info_down);

                    const daysleft = x - today_minus_ad;
                    let strdaysleft = '';
                    if (daysleft < -1) {
                        strdaysleft = ` (${-daysleft} Days Ago)`;
                    } else {
                        switch (daysleft) {
                            case -1:
                                strdaysleft = " (Yesterday)";
                                break
                            case 0:
                                strdaysleft = " (Today)";
                                break;
                            case 1:
                                strdaysleft = " (Tomorrow)";
                                break;
                        }
                    }
                    screen.textAlign = "center";
                    screen.textBaseline = "bottom";
                    screen.font = font_size + 'px Open Sans';
                    const row_height = screen.measureText(0).width * 2;
                    screen.fillText(`Due Date: ${due_date.toLocaleDateString("en-US", date_string_options)}${strdaysleft}`, 50+(width-50)/2, row_height);
                    if (lw < y && daysleft > 0) {
                        todo -= lw;
                        let reach_deadline = "";
                        if (todo <= 0 || nwd.includes((assign_day_of_week+dif_assign+day) % 7)) {
                            todo = 0;
                            reach_deadline = " (Deadline Reached)";
                        } else if (!unit_is_minute) {
                            screen.fillText(`Estimated Completion Time: ${format_minutes(todo*ctime)}`, 50+(width-50)/2, row_height*6);
                        } else if (todo*ctime >= 60) {
                            reach_deadline = ` (${format_minutes(todo*ctime)})`;
                        }
                        let displayed_day = new Date(date_assignment_created.valueOf());
                        displayed_day.setDate(displayed_day.getDate() + day);
                        const distance_today_from_displayed_day = today_minus_dac - day;
                        let str_day = displayed_day.toLocaleDateString("en-US", date_string_options);
                        switch (distance_today_from_displayed_day) {
                            case -1:
                                str_day += ' (Tomorrow)';
                                break;
                            case 0:
                                str_day += ' (Today)';
                                break;
                            case 1:
                                str_day += ' (Yesterday)';
                                break;
                        }
                        str_day += ':';
                        screen.fillText(str_day, 50+(width-50)/2, row_height*3);
                        let todo_message;
                        if (displayed_day.toDateString() !== new Date().toDateString()) {
                            todo_message = `${pluralize(unit)} to Complete for this Day: ${todo}${reach_deadline}`;
                        } else if (assignmentIsInProgress()) {
                            todo_message = `Remaining ${pluralize(unit)} to Complete for Today: ${todo}${reach_deadline}`;
                        } else {
                            todo_message = `${pluralize(unit)} to Complete for Today: ${todo}${reach_deadline}`;
                        }
                        screen.fillText(todo_message, 50+(width-50)/2, row_height*4);
                        screen.fillText(`${pluralize(unit)} already Completed: ${lw}/${y}`, 50+(width-50)/2, row_height*5);
                        if (today_minus_ad < 0) {
                            screen.fillText("This Assignment has Not Yet been Assigned", 50+(width-50)/2, row_height*8);
                        } else if (distance_today_from_displayed_day > 0) {
                            screen.fillText("You have not Entered your Work from Previous Days", 50+(width-50)/2, row_height*8);
                            screen.fillText("Please Enter in your Progress to Continue", 50+(width-50)/2, row_height*9);
                        } else if (nwd.includes((assign_day_of_week+dif_assign+day) % 7) || new Date(displayed_day.toDateString()) > new Date(new Date().toDateString())) {
                            if (displayed_day.toDateString() === new Date().toDateString()) {
                                screen.fillText("You have Completed your Work for Today", 50+(width-50)/2, row_height*9);
                            } else {
                                screen.fillText("You have Completed your Work for this Day", 50+(width-50)/2, row_height*9);
                            }
                        } else if (len_works && !assignmentIsInProgress() && (lw - sa.works[len_works-1]) / warning_acceptance * 100 < c_funct(len_works + dif_assign) - sa.works[len_works-1]) {
                            screen.fillText("!!! ALERT !!!", 50+(width-50)/2, row_height*8);
                            screen.fillText("You are Behind Schedule!", 50+(width-50)/2, row_height*9);
                        }
                    } else {
                        screen.fillText('You have Finished this Assignment!', 50+(width-50)/2, row_height*7);
                    }
                    screen.scale(1 / scale, 1 / scale);
                }

                function drawfixed() {
                    // These only really need to be executed once since this function is run for every assignment but doesnt matter
                    width = $(fixed_graph).width();
                    height = $(fixed_graph).height();
                    if (width > 500) {
                        font_size = 13.9;
                    } else {
                        font_size = Math.round((width + 450) / 47 * 0.6875);
                    }
                    scale = window.devicePixelRatio;
                    wCon = (width - 55) / x;
                    hCon = (height - 55) / y;

                    graph.width = width * scale;
                    graph.height = height * scale;
                    fixed_graph.width = width * scale;
                    fixed_graph.height = height * scale;
                    let screen = fixed_graph.getContext("2d");
                    screen.scale(scale, scale);

                    // bg gradient
                    let gradient = screen.createLinearGradient(0, 0, 0, height * 4 / 3);
                    gradient.addColorStop(0, "white");
                    gradient.addColorStop(1, "lightgray");
                    screen.fillStyle = gradient;
                    screen.fillRect(0, 0, width, height * 4 / 3);

                    // x and y axis rectangles
                    screen.fillStyle = "rgb(185,185,185)";
                    screen.fillRect(40, 0, 10, height);
                    screen.fillRect(0, height - 50, width, 10);

                    // x axis label
                    screen.fillStyle = "black";
                    screen.textAlign = "center";
                    screen.font = '17.1875px Open Sans';
                    screen.fillText("Days", (width - 50) / 2 + 50, height - 5);

                    // y axis label
                    screen.rotate(Math.PI / 2);
                    if (unit_is_minute) {
                        var text = 'Minutes of Work',
                            label_x_pos = -2;
                    } else {
                        var text = `${pluralize(unit)} (${format_minutes(ctime)} per ${pluralize(unit,1)})`,
                            label_x_pos = -5;
                    }
                    if (screen.measureText(text).width > height - 50) {
                        text = pluralize(unit);
                    }
                    screen.fillText(text, (height - 50) / 2, label_x_pos);
                    screen.rotate(-Math.PI / 2);

                    screen.font = '13.75px Open Sans';
                    screen.textBaseline = "top";
                    const x_axis_scale = Math.pow(10, Math.floor(Math.log10(x))) * Math.ceil(x.toString()[0] / Math.ceil((width - 100) / 100));
                    if (x >= 10) {
                        gradient = screen.createLinearGradient(0, 0, 0, height * 4 / 3);
                        gradient.addColorStop(0, "gainsboro");
                        gradient.addColorStop(1, "silver");
                        const small_x_axis_scale = x_axis_scale / 5,
                            label_index = screen.measureText(Math.floor(x)).width * 1.25 < small_x_axis_scale * wCon;
                        for (let smaller_index = 1; smaller_index <= Math.floor(x / small_x_axis_scale); smaller_index++) {
                            if (smaller_index % 5) {
                                const displayed_number = smaller_index * small_x_axis_scale;
                                screen.fillStyle = gradient; // Line color
                                screen.fillRect(displayed_number * wCon + 48.5, 0, 2, height - 50); // Draws line index
                                screen.fillStyle = "rgb(80,80,80)"; // Number color
                                if (label_index) {
                                    const numberwidth = screen.measureText(displayed_number).width;
                                    let number_x_pos = displayed_number * wCon + 50;
                                    if (number_x_pos + numberwidth / 2 > width - 1) {
                                        number_x_pos = width - numberwidth / 2 - 1;
                                    }
                                    screen.fillText(displayed_number, number_x_pos, height - 39);
                                }
                            }
                        }
                    }

                    screen.textBaseline = "alphabetic";
                    screen.textAlign = "right";
                    const y_axis_scale = Math.pow(10, Math.floor(Math.log10(y))) * Math.ceil(y.toString()[0] / Math.ceil((height - 100) / 100));
                    let font_size5 = 16.90625 - Math.ceil(y - y % y_axis_scale).toString().length * 1.71875;
                    if (y >= 10) {
                        const small_y_axis_scale = y_axis_scale / 5;
                        if (font_size5 < 8.5) {
                            font_size5 = 8.5;
                        }
                        screen.font = font_size5 + 'px Open Sans';
                        const text_height = screen.measureText(0).width * 2,
                            label_index = text_height < small_y_axis_scale * hCon;
                        for (let smaller_index = 1; smaller_index <= Math.floor(y / small_y_axis_scale); smaller_index++) {
                            const displayed_number = smaller_index * small_y_axis_scale;
                            if (smaller_index % 5) {
                                const gradient_percent = 1 - (displayed_number * hCon) / (height - 50);
                                screen.fillStyle = `rgb(${220-16*gradient_percent},${220-16*gradient_percent},${220-16*gradient_percent})`;
                                screen.fillRect(50, height - 51.5 - displayed_number * hCon, width - 50, 2);
                                screen.fillStyle = "rgb(80,80,80)";
                                if (label_index) {
                                    let number_y_pos = height - displayed_number * hCon - 54 + text_height / 2;
                                    if (number_y_pos < 4 + text_height / 2) {
                                        number_y_pos = 4 + text_height / 2;
                                    }
                                    if (38.5 - screen.measureText(displayed_number).width < 13 - label_x_pos) {
                                        screen.textAlign = "left";
                                        screen.fillText(displayed_number, 13 - label_x_pos, number_y_pos);
                                        screen.textAlign = "right";
                                    } else {
                                        screen.fillText(displayed_number, 38.5, number_y_pos);
                                    }
                                }
                            }
                        }
                    }
                    font_size5 *= 1.2;
                    screen.font = font_size5 + 'px Open Sans';
                    const text_height = screen.measureText(0).width * 2;
                    for (let bigger_index = Math.ceil(y - y % y_axis_scale); bigger_index > 0; bigger_index -= y_axis_scale) {
                        if (bigger_index * 2 < y_axis_scale) {
                            break;
                        }
                        screen.fillStyle = "rgb(205,205,205)";
                        screen.fillRect(50, height - bigger_index * hCon - 52.5, width - 50, 5);
                        screen.fillStyle = "black";
                        let number_y_pos = height - bigger_index * hCon - 54 + text_height / 2;
                        if (number_y_pos < 4 + text_height / 2) {
                            number_y_pos = 4 + text_height / 2;
                        }
                        if (38.5 - screen.measureText(bigger_index).width < 13 - label_x_pos) {
                            screen.textAlign = "left";
                            screen.fillText(bigger_index, 13 - label_x_pos, number_y_pos);
                            screen.textAlign = "right";
                        } else {
                            screen.fillText(bigger_index, 38.5, number_y_pos);
                        }
                    }
                    screen.fillText(0, 39, height - 52);

                    screen.textBaseline = "top";
                    screen.textAlign = "center";
                    screen.font = '16.5px Open Sans';
                    for (let bigger_index = Math.ceil(x - x % x_axis_scale); bigger_index > 0; bigger_index -= x_axis_scale) {
                        screen.fillStyle = "rgb(205,205,205)";
                        screen.fillRect(bigger_index * wCon + 47.5, 0, 5, height - 50);
                        screen.fillStyle = "black";
                        const numberwidth = screen.measureText(bigger_index).width;
                        let number_x_pos = bigger_index * wCon + 50;
                        if (number_x_pos + numberwidth / 2 > width - 1) {
                            number_x_pos = width - numberwidth / 2 - 1;
                        }
                        screen.fillText(bigger_index, number_x_pos, height - 39);
                    }
                    screen.fillText(0, 55.5, height - 38.5);
                    if (today_minus_ad > -1 && today_minus_ad <= x) {
                        let today_x = today_minus_ad*wCon+47.5;
                        screen.fillStyle = "rgb(150,150,150)";
                        screen.fillRect(today_x, 0, 5, height-50);
                        screen.fillStyle = "black";
                        screen.rotate(Math.PI / 2);
                        screen.textAlign = "center";
                        screen.textBaseline = "middle";
                        screen.font = '17.1875px Open Sans';
                        if (today_x > width - 12.5) {
                            today_x = width - 12.5;
                        }
                        screen.fillText("Today Line", (height-50)/2, -today_x-2.5);
                        screen.rotate(-Math.PI / 2);
                    }
                }
                // Sets event handlers only on the assignment's first click
                if (!not_first_click) {
                    // BEGIN Setup
                    function mousemove(e) {
                        var e = e || window.event;
                        const offset = $(fixed_graph).offset();
                        if (set_skew_ratio) {
                            ({ a, b, skew_ratio, cutoff_transition_value, cutoff_to_use_round, return_y_cutoff, return_0_cutoff } = c_pset(e.pageX - offset.left, e.pageY - offset.top));
                            day = len_works - assignmentIsInProgress();
                        }
                        // Passes in mouse x and y to draw, explained later
                        draw(e.pageX - offset.left, e.pageY - offset.top);
                    }
                    $(graph).off("mousemove").mousemove(mousemove); // Turn off mousemove to ensure there is only one mousemove handler at a time
                    $(window).resize(resize);
                    // END Setup

                    // BEGIN Up and down arrow event handler
                    function ChangeSkewRatio() {
                        // Change skew ratio by +- 0.1 and cap it
                        if (whichkey === "ArrowDown") {
                            skew_ratio = +(skew_ratio - 0.1).toFixed(1);
                            if (skew_ratio < 2 - skew_ratio_lim) {
                                skew_ratio = skew_ratio_lim;
                            }
                        } else {
                            skew_ratio = +(skew_ratio + 0.1).toFixed(1);
                            if (skew_ratio > skew_ratio_lim) {
                                skew_ratio = 2 - skew_ratio_lim;
                            }
                        }
                        ({ a, b, skew_ratio, cutoff_transition_value, cutoff_to_use_round, return_y_cutoff, return_0_cutoff } = c_pset());
                        day = len_works - assignmentIsInProgress();
                        // Save skew ratio and draw
                        sa.skew_ratio = skew_ratio; // Change this so it is locally saved when the assignment is closed so it is loaded in correctly when reopened
                        old_skew_ratio = skew_ratio;
                        SendAttributeAjax('skew_ratio', skew_ratio, sa.id);
                        draw();
                    }
                    let graphtimeout, // set the hold delay to a variable so it can be cleared key if the user lets go of it within 500ms
                        fired = false, // $(document).keydown( fires for every frame a key is held down. This makes it behaves like it fires once
                        graphinterval,
                        whichkey;
                    $(document).keydown(function(e) {
                        var e = e || window.event;
                        // $(fixed_graph).is(":visible") to make sure it doesnt change when the assignment is closed
                        // !$(document.activeElement).hasClass("skew-ratio-textbox") prevents double dipping
                        if ((e.key === "ArrowUp" || e.key === "ArrowDown") && $(fixed_graph).is(":visible") && !$(document.activeElement).hasClass("skew-ratio-textbox")) {
                            const rect = fixed_graph.getBoundingClientRect();
                            // Makes sure graph is on screen
                            if (rect.bottom - rect.height / 1.5 > 70 && rect.y + rect.height / 1.5 < window.innerHeight && !fired) {
                                // "fired" makes .keydown fire only when a key is pressed, not repeatedly
                                fired = true;
                                // Which key was pressed
                                whichkey = e.key;
                                // Change skew ratio
                                ChangeSkewRatio();
                                // Add delay to change skew ratio internal
                                graphtimeout = setTimeout(function() {
                                    clearInterval(graphinterval);
                                    graphinterval = setInterval(ChangeSkewRatio, 13); // Changes skew ratio
                                }, 500);
                            }
                        }
                    });
                    $(document).keyup(function(e) {
                        var e = e || window.event;
                        if (e.key === whichkey) {
                            // If the keyup was the same key that was just pressed stop change skew ratio
                            fired = false;
                            clearTimeout(graphtimeout);
                            clearInterval(graphinterval);
                        }
                    });
                    // END Up and down arrow event handler

                    //
                    // Nine buttons event listeners
                    //
                    const skew_ratio_button = assignment.find(".skew-ratio-button"),
                        total_work_input_button = assignment.find(".total-work-input-button"),
                        display_button = assignment.find(".display-button"),
                        skew_ratio_textbox = assignment.find(".skew-ratio-textbox"),
                        submit_work_button = assignment.find(".submit-work-button"),
                        hide_assignment_button = assignment.find(".hide-assignment-button"),
                        fixed_mode_button = assignment.find(".fixed-mode-button"),
                        delete_work_input_button = assignment.find(".delete-work-input-button"),
                        next_assignment_button = assignment.find(".next-assignment-button");

                    // BEGIN Set skew ratio button
                    skew_ratio_button.click(function() {
                        $(this).onlyText("(Click again to cancel)").one("click", cancel_sr);
                        // Turn off mousemove to ensure there is only one mousemove handler at a time
                        $(graph).off("mousemove").mousemove(mousemove);
                        set_skew_ratio = true;
                    });
                    let old_skew_ratio = skew_ratio; // Old skew ratio is the old original value of the skew ratio if the user decides to cancel
                    $(graph).click(function(e) {
                        if (set_skew_ratio) {
                            // Runs if (set_skew_ratio && draw_point || set_skew_ratio && !draw_point)
                            set_skew_ratio = false;
                            // stop set skew ratio if canvas is clicked
                            $(this).next().find(".skew-ratio-button").onlyText("Set skew ratio using graph").off("click", cancel_sr);
                            // Save skew ratio
                            sa.skew_ratio = skew_ratio; // Change this so it is locally saved when the assignment is closed so it is loaded in correctly when reopened
                            old_skew_ratio = skew_ratio;
                            SendAttributeAjax('skew_ratio', skew_ratio, sa.id);
                            // Disable mousemove
                            if (!draw_point) {
                                $(this).off("mousemove");
                            }
                            sort();
                            draw();
                        } else if (draw_point) {
                            if (!isMobile) {
                                // Runs if (!set_skew_ratio && draw_point) and not on mobile
                                // Disable draw point
                                $(this).off("mousemove");
                                draw_point = false;
                                last_mouse_x = -1;
                                draw();
                            }
                        } else {
                            // Runs if (!set_skew_ratio && !draw_point)
                            // Enable draw point
                            draw_point = true;
                            // Turn off mousemove to ensure there is only one mousemove handler at a time
                            $(this).off("mousemove").mousemove(mousemove);
                            // Pass in e because $.trigger makes e.pageX undefined
                            mousemove(e);
                        }
                    });
                    // Cancel set skew ratio
                    function cancel_sr() {
                        $(this).onlyText("Set skew ratio using graph");
                        set_skew_ratio = false;
                        skew_ratio = old_skew_ratio;
                        draw();
                        // No need to ajax since skew ratio is the same
                    }
                    // END Set skew ratio button

                    // BEGIN Submit work button
                    submit_work_button.click(function() {
                        if (!total_work_input_button.val()) return;
                        if (lw >= y) {
                            alert("You have already finished this assignment");
                        } else if (today_minus_dac > -1) {
                            if (nwd.includes((assign_day_of_week + dif_assign + day) % 7)) {
                                var todo = 0;
                            } else {
                                var todo = c_funct(day + dif_assign + 1) - lw;
                            }
                            const rem_work = assignmentIsInProgress();
                            let input_done = total_work_input_button.val().trim().toLowerCase();
                            switch (input_done) {
                                case "fin":
                                    input_done = c_funct(day + dif_assign + 1);
                                    break;
                                default: {
                                    input_done = +input_done;
                                    if (isNaN(input_done)) {
                                        return alert("Value isn't a number or keyword");
                                    }
                                }
                            }
                            if (len_works + dif_assign === x - 1 && x - 1 !== today_minus_ad && input_done < y && !rem_work) {
                                return alert("Your last work input must complete the assignment");
                            }
                            if (input_done < 0) {
                                input_done = 0;
                            }
                            if (rem_work) {
                                sa.works[len_works] = input_done;
                                len_works -= 1;
                            } else {
                                sa.works.push(input_done);
                            }
                            lw = input_done;
                            len_works++;
                            if (input_done !== todo) {
                                if (len_works + dif_assign === x) {
                                    sa.dynamic_start = len_works + dif_assign - 1;
                                } else {
                                    sa.dynamic_start = len_works + dif_assign;
                                }
                                SendAttributeAjax("dynamic_start", sa.dynamic_start, sa.id);
                                if (!sa.fixed_mode) {
                                    red_line_start_x = sa.dynamic_start;
                                    red_line_start_y = sa.works[sa.dynamic_start - dif_assign];
                                    if (nwd.length) {
                                        mods = c_calc_mod_days();
                                    }
                                    set_skew_ratio_lim();
                                    ({ a, b, skew_ratio, cutoff_transition_value, cutoff_to_use_round, return_y_cutoff, return_0_cutoff } = c_pset());
                                }
                            }
                            SendAttributeAjax("works", sa.works.map(String), sa.id);
                            day = len_works - assignmentIsInProgress();
                            sort();
                            draw();
                        } else {
                            alert("Please wait until this is assigned");
                        }
                    });
                    // END Submit work button

                    // BEGIN Fixed/dynamic mode button
                    fixed_mode_button.click(function() {
                        sa.fixed_mode = !sa.fixed_mode;
                        $(this).onlyText(sa.fixed_mode ? "Switch to Dynamic mode" : "Switch to Fixed mode");
                        SendAttributeAjax('fixed_mode', sa.fixed_mode, sa.id);
                        if (sa.fixed_mode) {
                            // Set start of red line and pset()
                            red_line_start_x = 0;
                            red_line_start_y = 0;
                            ({ a, b, skew_ratio, cutoff_transition_value, cutoff_to_use_round, return_y_cutoff, return_0_cutoff } = c_pset());
                            // Day needs to be set in case it was subtracted by one
                            day = len_works - assignmentIsInProgress();
                        } else {
                            red_line_start_x = sa.dynamic_start;
                            red_line_start_y = sa.works[red_line_start_x - dif_assign];
                            day = len_works;
                            // No need to pset()
                            // Caps dynamic start at x, wouldn't make sense for todo to be shown for the day on the due date
                            if (len_works + dif_assign === x) {
                                day--;
                            }
                        }
                        if (nwd.length) {
                            mods = c_calc_mod_days();
                        }
                        sort();
                        draw();
                    }).html(sa.fixed_mode ? "Switch to Dynamic mode" : "Switch to Fixed mode");
                    // END Fixed/dynamic mode button

                    // BEGIN Skew ratio textbox
                    skew_ratio_textbox.on("keydown paste click keyup", function() { // keydown for normal sr and keyup for delete
                        var e = e || window.event;
                        if (old_skew_ratio === undefined) {
                            // Sets old_skew_ratio
                            old_skew_ratio = skew_ratio;
                        }
                        if ($(this).val()) {
                            // Sets and caps skew ratio
                            // The skew ratio in the code is 1 more than the displayed skew ratio
                            skew_ratio = +$(this).val() + 1;
                            if (skew_ratio > skew_ratio_lim) {
                                skew_ratio = 2 - skew_ratio_lim;
                            } else if (skew_ratio < 2 - skew_ratio_lim) {
                                skew_ratio = skew_ratio_lim;
                            }
                        } else {
                            // Reset skew ratio to old value if blank
                            skew_ratio = old_skew_ratio;
                            old_skew_ratio = undefined;
                        }
                        sort();
                        draw();
                    }).keypress(function(e) {
                        var e = e || window.event;
                        // Saves skew ratio on enter
                        if (e.key === "Enter") {
                            // focusout event
                            this.blur();
                        }
                    }).focusout(function() {
                        $(this).val('');
                        if (old_skew_ratio !== undefined) {
                            // Save skew ratio
                            sa.skew_ratio = skew_ratio; // Change this so it is locally saved when the assignment is closed so it is loaded in correctly when reopened
                            old_skew_ratio = skew_ratio;
                            SendAttributeAjax('skew_ratio', skew_ratio, sa.id);
                        }
                        // Update old skew ratio
                        old_skew_ratio = skew_ratio;
                    });
                    // END Skew ratio textbox

                    // BEGIN Display button
                    display_button.click(function() {
                        alert("This feature has not yet been implented");
                    }).css("text-decoration", "line-through");
                    // END Display button

                    // BEGIN Delete work input button
                    delete_work_input_button.click(function() {
                        if (len_works > 0) {
                            // Change day if assignment isn't in progress
                            if (!assignmentIsInProgress()) {
                                day--;
                            }
                            sa.works.pop();
                            len_works--;
                            lw = sa.works[len_works];

                            // If the deleted work input cut the dynamic start, run this
                            // Reverses the logic of work inputs in and recursively decreases red_line_start_x
                            if (red_line_start_x > len_works + dif_assign) {
                                // The outer for loop decrements red_line_start_x if the inner for loop didn't break
                                outer: for (red_line_start_x = red_line_start_x - 2; red_line_start_x > dif_assign; red_line_start_x--) {
                                    red_line_start_y = sa.works[red_line_start_x - dif_assign];
                                    if (nwd.length) {
                                        mods = c_calc_mod_days();
                                    }
                                    set_skew_ratio_lim();
                                    ({ a, b, skew_ratio, cutoff_transition_value, cutoff_to_use_round, return_y_cutoff, return_0_cutoff } = c_pset());
                                    // The inner for loop checks if every work input is the same as the red line for all work inputs greater than red_line_start_x
                                    let next_funct = c_funct(red_line_start_x),
                                        next_work = sa.works[red_line_start_x - dif_assign];
                                    for (let i = red_line_start_x; i < len_works + dif_assign; i++) {
                                        const this_funct = next_funct,
                                            this_work = next_work;
                                        next_funct = c_funct(i + 1),
                                        next_work = sa.works[i - dif_assign + 1];
                                        // When a day is found where the work input isn't the same as the red line for that red_line_start_x, increase red_line_start_x back to where this doesnt happen and break
                                        if (next_funct - this_funct !== next_work - this_work) {
                                            red_line_start_x++;
                                            break outer;
                                        }
                                    }
                                }
                                if (red_line_start_x < dif_assign) {
                                    red_line_start_x = dif_assign;
                                }
                                red_line_start_y = sa.works[red_line_start_x - dif_assign];
                                if (nwd.length) {
                                    mods = c_calc_mod_days();
                                }
                                set_skew_ratio_lim();
                                sa.dynamic_start = red_line_start_x;
                                SendAttributeAjax("dynamic_start", sa.dynamic_start, sa.id)
                            }
                            SendAttributeAjax("works", sa.works.map(String), sa.id);
                            sort({do_not_autofill: true});
                            draw();
                        }
                    });
                    // END Delete work input button

                    // BEGIN Hide assignment button
                    hide_assignment_button.click(function() {
                        alert("This feature has not yet been implented");
                    }).css("text-decoration", "line-through");
                    // END Hide assignment button

                    // BEGIN Next assignment button
                    next_assignment_button.click(function() {
                        const next_assignment = assignment.parent().next().children().first();
                        // Only close if next assignment exists
                        if (next_assignment.length) {
                            assignment.click();
                        }
                        // Only open next assignment if closed
                        if (!next_assignment.hasClass("open-assignment")) {     
                            next_assignment.click();
                        }
                    });
                    // END Next assignment button

                    // BEGIN Info buttons
                    skew_ratio_button.info("right", 
                        `The skew ratio determines the work distribution of the graph

                        Click this button and hover and click the graph
                        
                        Note: this has no effect on assignments with only one working day (since there is only one possible work distribution)`
                    );

                    total_work_input_button.info("top",
                        `Enter the total number of units done on the graph's displayed date and submit
                        
                        Keyword: enter "fin" if you have completed an assignment's work for its displayed date`,"after"
                    ).css({
                        left: "calc(50% + 63px)",
                        top: 3,
                        position: "absolute",
                    });

                    fixed_mode_button.info("top",
                        `Fixed mode:
                        In this mode, the graph is static and does not change. If you fail to complete the specified amount of work for any day, the assignment is marked as "in progress," and you will have to make up the remainder of its work later that day. If you still don't finish its work, you will have to make it up on the next day

                        This mode is recommended for discipline or if the assignment is important


                        Dynamic mode (default):
                        In this mode, if you fail to complete the specified amount of work for any day, the graph will change itself to start at your last work input, adapting to your work schedule

                        This mode is recommended if you can't keep up with an assignment's work schedule. It's easy to fall behind with this mode, so be careful`
                    ).children().first().css({
                        fontSize: 11,
                        lineHeight: "11px",
                    });

                    skew_ratio_textbox.info("right", "Enter skew ratio as a number. Leave this blank to cancel or press enter to save",'after').css({
                        left: 134,
                        position: "absolute",
                        bottom: 36,
                    });
                    // END Info buttons
                }
                function resize() {
                    // If autofilled by $(window).trigger("resize")
                    len_works = sa.works.length - 1;
                    if (!sa.fixed_mode) {
                        red_line_start_x = sa.dynamic_start;
                        red_line_start_y = sa.works[sa.dynamic_start - dif_assign];
                        if (nwd.length) {
                            mods = c_calc_mod_days();
                        }
                        set_skew_ratio_lim();
                        ({ a, b, skew_ratio, cutoff_transition_value, cutoff_to_use_round, return_y_cutoff, return_0_cutoff } = c_pset());
                    }
                    day = len_works - assignmentIsInProgress();
                    lw = sa.works[len_works];
                    if (assignment.hasClass("open-assignment") && assignment.is(":visible")) {
                        drawfixed();
                        draw();
                    }
                }
                resize();
                //
                // End draw graph
                //
                if ("first_login" in sessionStorage) {
                    $(".assignment").next().remove(); // Remove "Click this assignment"
                    setTimeout(function() {
                        alert("Welcome to the graph, a visualization of how your assignment's work schedule will look like");
                        alert(`The graph splits up your assignment in days over units of work, with day zero being its assignment date and the last day being its due date`);
                        alert("The red line is the generated work schedule of this assignment, and it can be adjusted by changing its skew ratio");
                        alert("As you progress through your assignment, you will have to enter your own work inputs every day to measure your progress");
                        alert("The blue line will be your daily work inputs for this assignment. This is not yet visible because you have not entered any work inputs");
                        if (x <= 2) {
                            alert(`Note: since this assignment is due in only ${x} day${x-dif_assign === 1 ? '' : 's'}, there isn't much to display on the graph. Longer-term assignments are more effective for this visualization`);
                        }
                        alert("Once you add more assignments, they are prioritized based on their estimated completion times");
                        alert("Now that you have finished reading this, click the info icons next to each of the buttons and check out the settings to set your preferences");
                        sessionStorage.removeItem("first_login");
                    }, 200);
                }
                // Makes input bigger for info button
                if (show_info_buttons || "first_login" in sessionStorage) {
                    assignment.find(".total-work-input-button").css("width", 163);
                    // Position up/down input scroller
                    assignment.find(".skew-ratio-textbox").addClass("translate-left");
                }
            }
            assignment.data('not_first_click', true);
        }
    });
});