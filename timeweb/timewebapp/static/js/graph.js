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
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
        }
    }
    $(".assignment").click(function(e) {
        // Runs the click function if
        // The background of the assignment was clicked
        // The footer wasn't clicked (to prevent accidental closing)
        if (!["IMG", "CANVAS"].includes(e.target.tagName) && !$(e.target).parents(".graph-footer").length && !$(e.target).hasClass("graph-footer")) {
            let dom_assignment = $(this);
            let sa = utils.loadAssignmentData(dom_assignment);
            // If the assignment is marked as completed but marked as completed isn't enabled, it must have been marked because of break days or an incomplete work schedule
            if (dom_assignment.hasClass("mark-as-done") && !sa.mark_as_done) {
                $(".assignment").first().focus().parent().animate({left: -5}, 75, "easeOutCubic", function() {
                    $(this).animate({left: 5}, 75, "easeOutCubic", function() {
                        $(this).animate({left: 0}, 75, "easeOutCubic");
                    });
                });
                return
            }
            const graph_container = dom_assignment.find(".graph-container"),
                not_first_click = dom_assignment.data('not_first_click');
            if (graph_container.attr("style") && dom_assignment.hasClass("open-assignment")) {
                // Runs when assignment is clicked while open

                // Animate the graph's margin bottom to close the assignment
                graph_container.animate({
                    marginBottom: -graph_container.height()
                }, 750, "easeOutCubic", function() {
                    // Hide graph when transition ends
                    dom_assignment.css("overflow", "");
                    graph_container.removeAttr("style")
                    // Used in crud.js to resolve a promise to transition deleting the assignment
                    .trigger("transitionend");
                });
                // Begin arrow animation
                this.querySelector(".fallingarrowanimation").beginElement();
                // Make assignment overflow hidden 
                dom_assignment.removeClass("open-assignment").css("overflow", "hidden");
                // If no graphs are open, allow arrow scroll
                if ($(".open-assignment").length === 0) {
                    $(document).off("keydown", PreventArrowScroll);
                }
            } else {
                // If the assignment was clicked while it was closing, stop the closing animation and open it
                graph_container.stop();
                dom_assignment.css("overflow", "");
                graph_container.css({
                    "display": "",
                    "margin-bottom": "",
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
                dom_assignment.addClass("open-assignment");
                // Animate arrow
                this.querySelector(".risingarrowanimation").beginElement();
                
                let { ad, x, unit, y, dif_assign, skew_ratio, ctime, funct_round, min_work_time, break_days } = sa;
                // Type conversions
                ad = new Date(utils.formatting.parseDate(ad));
                x = utils.daysBetweenTwoDates(utils.formatting.parseDate(x), ad);
                y = +y;
                // dif assign is already an int
                skew_ratio = +skew_ratio;
                ctime = +ctime;
                funct_round = +funct_round;
                // Converts min_work_time to int if string or null
                min_work_time /= ctime;
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
                const min_work_time_funct_round = min_work_time ? Math.ceil(min_work_time / funct_round) * funct_round : funct_round; // LCM of min_work_time and funct_round
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
                // Handles break days, explained later
                let mods,
                    assign_day_of_week = ad.getDay(); // Used with mods
                if (break_days.length) {
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
                let today_minus_dac = utils.daysBetweenTwoDates(date_now, date_assignment_created),
                    // Days between today and the assignment date
                    today_minus_ad = utils.daysBetweenTwoDates(date_now, ad);
                let a, b, /* skew_ratio has already been declared */ cutoff_transition_value, cutoff_to_use_round, return_y_cutoff, return_0_cutoff;
                ({ a, b, skew_ratio, cutoff_transition_value, cutoff_to_use_round, return_y_cutoff, return_0_cutoff } = c_pset());
                const assignmentIsInProgress = () => (today_minus_dac === len_works - 1 || len_works + dif_assign === x && today_minus_dac === len_works) && c_funct(len_works + dif_assign) > lw && !break_days.includes(date_now.getDay());
                let day = len_works - assignmentIsInProgress();
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
                
                function set_skew_ratio_lim() {
                    const y1 = y - red_line_start_y;
                    if (!y1) {
                        skew_ratio_lim = 0;
                    } else {
                        let x1 = x - red_line_start_x;
                        if (break_days.length) {
                            x1 -= Math.floor(x1 / 7) * break_days.length + mods[x1 % 7];
                        }
                        /*
                        skew_ratio = (a + b) * x1 / y1;
                        skew_ratio = funct(1) * x1 / y1;
                        skew_ratio = (y1+min_work_time_funct_round) * x1 / y1;
                        */
                        skew_ratio_lim = Math.round((y1 + min_work_time_funct_round) * x1 / y1 * 10)/10;
                    }
                    dom_assignment.find(".skew-ratio-textbox").attr({
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
                    const center = (str, y_pos) => screen.fillText(str, 50+(width-50)/2, row_height*y_pos);
                    center(`Due Date: ${due_date.toLocaleDateString("en-US", date_string_options)}${strdaysleft}`, 1);
                    if (lw < y) {
                        todo -= lw;
                        if (todo < 0 || break_days.includes((assign_day_of_week+dif_assign+day) % 7)) {
                            todo = 0;
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
                        center(str_day, 3);
                        center(`Goal for ${displayed_day.valueOf() === date_now.valueOf() ? "Today" : "this Day"}: ${lw + todo}/${y} ${pluralize(unit,2)}`, 4);
                        if (today_minus_ad < 0) {
                            center("This Assignment has Not Yet been Assigned", 6);
                        } else if (distance_today_from_displayed_day > 0) {
                            center("You haven't Entered your Work from Previous Days", 6);
                            center("Please Enter your Progress to Continue", 7);
                        } else if (break_days.includes((assign_day_of_week+dif_assign+day) % 7) || displayed_day.valueOf() > date_now.valueOf()) {
                            center("You have Completed your Work for Today", 6);
                        } else if (len_works && !assignmentIsInProgress() && (lw - sa.works[len_works-1]) / warning_acceptance * 100 < c_funct(len_works + dif_assign) - sa.works[len_works-1]) {
                            center("!!! ALERT !!!", 6);
                            center("You are Behind Schedule!", 7);
                        }
                    } else {
                        center('You are Completely Finished with this Assignment!', 5);
                    }
                    screen.scale(1 / scale, 1 / scale);
                }

                function drawfixed() {
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
                        var text = `${pluralize(unit)} (${utils.formatting.formatMinutes(ctime)} per ${pluralize(unit,1)})`,
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
                        const offset = $(fixed_graph).offset();
                        if (set_skew_ratio) {
                            ({ a, b, skew_ratio, cutoff_transition_value, cutoff_to_use_round, return_y_cutoff, return_0_cutoff } = c_pset(e.pageX - offset.left, e.pageY - offset.top));
                            day = len_works - assignmentIsInProgress();
                        }
                        // Passes in mouse x and y to draw, explained later
                        draw(e.pageX - offset.left, e.pageY - offset.top);
                    }
                    let x1 = x - red_line_start_x; // Amount of working days in the assignment
                    if (break_days.length) {
                        x1 -= Math.floor(x1 / 7) * break_days.length + mods[x1 % 7]; // Handles break days, explained later
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
                        ajaxUtils.SendAttributeAjaxWithTimeout('skew_ratio', skew_ratio, sa.id);
                        draw();
                    }
                    let graphtimeout, // set the hold delay to a variable so it can be cleared key if the user lets go of it within 500ms
                        fired = false, // $(document).keydown( fires for every frame a key is held down. This makes it behaves like it fires once
                        graphinterval,
                        whichkey;
                    $(document).keydown(function(e) {
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
                    const skew_ratio_button = dom_assignment.find(".skew-ratio-button"),
                        work_input_button = dom_assignment.find(".work-input-button"),
                        display_button = dom_assignment.find(".display-button"),
                        skew_ratio_textbox = dom_assignment.find(".skew-ratio-textbox"),
                        submit_work_button = dom_assignment.find(".submit-work-button"),
                        hide_assignment_button = dom_assignment.find(".mark-as-finished-button"),
                        fixed_mode_button = dom_assignment.find(".fixed-mode-button"),
                        delete_work_input_button = dom_assignment.find(".delete-work-input-button"),
                        next_assignment_button = dom_assignment.find(".next-assignment-button");

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
                                outer: for (red_line_start_x = red_line_start_x - 2; red_line_start_x >= dif_assign; red_line_start_x--) {
                                    red_line_start_y = sa.works[red_line_start_x - dif_assign];
                                    if (break_days.length) {
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
                                            break outer;
                                        }
                                    }
                                }
                                // ++ for three cases:
                                // if for loop doesnt run, do ++ to fix red_line_start_x
                                // if for loop finds, do ++
                                // if for loop doesnt find, change > dif_assign to >= dif_assign and do ++
                                red_line_start_x++;
                                red_line_start_y = sa.works[red_line_start_x - dif_assign];
                                if (break_days.length) {
                                    mods = c_calc_mod_days();
                                }
                                set_skew_ratio_lim();
                                sa.dynamic_start = red_line_start_x;
                                ajaxUtils.SendAttributeAjaxWithTimeout("dynamic_start", sa.dynamic_start, sa.id)
                            }
                            ajaxUtils.SendAttributeAjaxWithTimeout("works", sa.works.map(String), sa.id);
                            priority.sort({do_not_autofill: true}); // Don't autofill on delete work input because it'll just undo the delete in some cases
                            draw();
                        }
                    });
                    // END Delete work input button

                    // BEGIN Submit work button
                    submit_work_button.click(function() {
                        if (!work_input_button.val()) return;
                        if (lw >= y) {
                            alert("You have already finished this assignment");
                        } else if (today_minus_dac > -1) {
                            if (break_days.includes((assign_day_of_week + dif_assign + day) % 7)) {
                                var todo = 0;
                            } else {
                                var todo = c_funct(day + dif_assign + 1) - lw;
                            }
                            const rem_work = assignmentIsInProgress();
                            let input_done = work_input_button.val().trim().toLowerCase();
                            switch (input_done) {
                                case "fin":
                                    input_done = c_funct(day + dif_assign + 1) - lw; // This can't be todo because of break_days
                                    break;
                                default: {
                                    input_done = +input_done;
                                    if (isNaN(input_done)) {
                                        return alert("Value isn't a number or keyword");
                                    }
                                }
                            }
                            if (len_works + dif_assign === x - 1 && x - 1 !== today_minus_ad && input_done + lw < y && !rem_work) {
                                return alert("Your last work input must complete this assignment");
                            }
                            if (input_done + lw < 0) {
                                input_done = -lw;
                            }
                            if (rem_work) {
                                sa.works[len_works] = input_done + lw;
                                len_works -= 1;
                            } else {
                                sa.works.push(input_done + lw);
                            }
                            lw += input_done;
                            len_works++;
                            if (input_done !== todo) {
                                if (len_works + dif_assign === x) {
                                    sa.dynamic_start = len_works + dif_assign - 1;
                                } else {
                                    sa.dynamic_start = len_works + dif_assign;
                                }
                                ajaxUtils.SendAttributeAjaxWithTimeout("dynamic_start", sa.dynamic_start, sa.id);
                                if (!sa.fixed_mode) {
                                    red_line_start_x = sa.dynamic_start;
                                    red_line_start_y = sa.works[sa.dynamic_start - dif_assign];
                                    if (break_days.length) {
                                        mods = c_calc_mod_days();
                                    }
                                    set_skew_ratio_lim();
                                    ({ a, b, skew_ratio, cutoff_transition_value, cutoff_to_use_round, return_y_cutoff, return_0_cutoff } = c_pset());
                                }
                            }
                            ajaxUtils.SendAttributeAjaxWithTimeout("works", sa.works.map(String), sa.id);
                            day = len_works - assignmentIsInProgress();
                            priority.sort();
                            draw();
                        } else {
                            alert("Please wait until this is assigned");
                        }
                    });
                    // END Submit work button

                    // BEGIN Display button
                    display_button.click(function() {
                        alert("This feature has not yet been implented");
                    }).css("text-decoration", "line-through");
                    // END Display button

                    // BEGIN Mark as finished button
                    hide_assignment_button.click(function() {
                        sa.mark_as_done = !sa.mark_as_done;
                        $(this).onlyText(sa.mark_as_done ? "Unmark as Finished for Today" : "Mark as Finished for Today");
                        ajaxUtils.SendAttributeAjaxWithTimeout('mark_as_done', sa.mark_as_done, sa.id);
                        priority.sort({ ignore_timeout: true });
                    }).html(sa.mark_as_done ? "Unmark as Finished for Today" : "Mark as Finished for Today");
                    // END Mark as finished button

                    // BEGIN Next assignment button
                    next_assignment_button.click(function() {
                        const next_assignment = dom_assignment.parent().next().children().first();
                        // Only close if next assignment exists
                        if (next_assignment.length) {
                            dom_assignment.click();
                        }
                        // Only open next assignment if closed
                        if (!next_assignment.hasClass("open-assignment")) {     
                            next_assignment.click();
                        }
                    });
                    // END Next assignment button

                    // BEGIN Set skew ratio using graph button
                    let not_applicable_timeout2;
                    skew_ratio_button.click(function() {
                        if (x1 <= 1) {
                            const $this = $(this);
                            $this.onlyText("Not Applicable");
                            clearTimeout(not_applicable_timeout2);
                            not_applicable_timeout2 = setTimeout(function() {
                                $this.onlyText("Set Skew Ratio using Graph"); // $(this) changes to window
                            }, 1000);
                            return;
                        }
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
                            ajaxUtils.SendAttributeAjaxWithTimeout('skew_ratio', skew_ratio, sa.id);
                            // Disable mousemove
                            if (!draw_point) {
                                $(this).off("mousemove");
                            }
                            priority.sort({ ignore_timeout: true });
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
                    // END Set skew ratio button using graph button

                    // BEGIN Skew ratio textbox
                    let not_applicable_timeout;
                    skew_ratio_textbox.on("keydown paste click keyup", function() { // keydown for normal sr and keyup for delete
                        if (old_skew_ratio === undefined) {
                            // Sets old_skew_ratio
                            old_skew_ratio = skew_ratio;
                        }
                        if (x1 <= 1) {
                            const $this = $(this);
                            $this.val('').attr("placeholder", "Not Applicable");
                            clearTimeout(not_applicable_timeout);
                            not_applicable_timeout = setTimeout(function() {
                                $this.attr("placeholder", "Enter Skew Ratio"); // $(this) changes to window
                            }, 1000);
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
                        draw();
                    }).keypress(function(e) {
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
                            ajaxUtils.SendAttributeAjaxWithTimeout('skew_ratio', skew_ratio, sa.id);
                        }
                        // Update old skew ratio
                        old_skew_ratio = skew_ratio;
                        priority.sort({ ignore_timeout: true });
                    });
                    // END Skew ratio textbox

                    // BEGIN Fixed/dynamic mode button
                    fixed_mode_button.click(function() {
                        sa.fixed_mode = !sa.fixed_mode;
                        $(this).onlyText(sa.fixed_mode ? "Switch to Dynamic mode" : "Switch to Fixed mode");
                        ajaxUtils.SendAttributeAjaxWithTimeout('fixed_mode', sa.fixed_mode, sa.id);
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
                        if (break_days.length) {
                            mods = c_calc_mod_days();
                        }
                        priority.sort();
                        draw();
                    }).html(sa.fixed_mode ? "Switch to Dynamic mode" : "Switch to Fixed mode");
                    // END Fixed/dynamic mode button

                    // BEGIN Info buttons
                    skew_ratio_button.info("top", 
                        `The skew ratio determines the work distribution of the graph

                        Click this button and hover and click the graph`
                    ).css("margin-right", 1);

                    work_input_button.info("top",
                        `Enter the number of units done on the graph's displayed date and submit
                        
                        Keyword: enter "fin" if you have completed an assignment's work for its displayed date`,"after"
                    ).css({
                        left: "calc(50% + 47px)",
                        top: 3,
                        position: "absolute",
                    });

                    fixed_mode_button.info("top",
                        `Fixed mode:
                        The red line always starts at the assignment date. If you don't finish a day's work, you'll have to make it up on the next day
                        This mode is recommended for discipline or if an assignment is important

                        Dynamic mode (default):
                        If you don't finish a day's work, the red line will readjust itself to start at your last work input, adapting to your work schedule
                        This mode is recommended if you can't keep up with an assignment's work schedule`, "prepend"
                    ).css("left", -3).children().first().css({
                        fontSize: 11,
                        lineHeight: "11px",
                    });

                    skew_ratio_textbox.info("top", 
                        `The skew ratio determines the work distribution of the graph

                        Enter this as a number. Leave this blank to cancel or press enter to save`,'after'
                    ).css({
                        left: "calc(50% + 56px)",
                        bottom: 37,
                        position: "absolute",
                    }).toggle($(".second-advanced-button").is(":visible")); // Initially hide this for "Advanced Buttons"
                    // END Info buttons
                }
                function resize() {
                    // If autofilled by $(window).trigger("resize")
                    len_works = sa.works.length - 1;
                    // If date_now is redefined
                    today_minus_dac = utils.daysBetweenTwoDates(date_now, date_assignment_created);
                    today_minus_ad = utils.daysBetweenTwoDates(date_now, ad);
                    if (!sa.fixed_mode) {
                        red_line_start_x = sa.dynamic_start;
                        red_line_start_y = sa.works[sa.dynamic_start - dif_assign];
                        if (break_days.length) {
                            mods = c_calc_mod_days();
                        }
                        set_skew_ratio_lim();
                        ({ a, b, skew_ratio, cutoff_transition_value, cutoff_to_use_round, return_y_cutoff, return_0_cutoff } = c_pset());
                    }
                    day = len_works - assignmentIsInProgress();
                    lw = sa.works[len_works];
                    
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
                    if (dom_assignment.hasClass("open-assignment") && dom_assignment.is(":visible")) {
                        graph.width = width * scale;
                        graph.height = height * scale;
                        fixed_graph.width = width * scale;
                        fixed_graph.height = height * scale;
                        drawfixed();
                        draw();
                    }
                }
                resize();
                //
                // End draw graph
                //
                if (first_login) {
                    $(".assignment").next().remove(); // Remove "Click this assignment"
                    setTimeout(function() {
                        alert("Welcome to the graph, a visualization of how your assignment's work schedule will look like");
                        alert("The graph splits up your assignment in days over units of work, with day zero being its assignment date and the last day being its due date. The red line is the generated work schedule of this assignment");
                        alert("As you progress through your assignment, you will have to enter your own work inputs to measure your progress on a daily basis");
                        alert("The blue line will be your daily work inputs for this assignment. This is not yet visible because you haven't entered any work inputs");
                        if (x <= 2) {
                            alert(`Note: since this assignment is due in only ${x} day${x-dif_assign === 1 ? '' : 's'}, there isn't much to display on the graph. Check out the example assignment to see how TimeWeb handles assignments with longer due dates`);
                        }
                        alert("Once you add more assignments, they are prioritized by color based on their estimated completion times and due dates");
                        alert("Now that you have finished reading this, check out the settings to set your preferences");
                        first_login = false;
                        ajaxUtils.sendTutorialAjax();
                    }, 200);
                }
                // Makes input bigger for info button
                if (show_info_buttons || first_login) {
                    dom_assignment.find(".work-input-button").css("width", 131);
                    // Position up/down input scroller
                    dom_assignment.find(".skew-ratio-textbox").css("width", 150).addClass("translate-left");
                } else {
                    dom_assignment.find(".work-input-button").css("width", 106);
                    dom_assignment.find(".skew-ratio-textbox").css("width", 125);
                }
            }
            dom_assignment.data('not_first_click', true);
        }
    });
});