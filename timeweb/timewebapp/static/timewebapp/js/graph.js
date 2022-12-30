// THIS FILE HAS NOT YET BEEN FULLY DOCUMENTED
class Assignment {
    constructor(dom_assignment) {
        this.sa = utils.loadAssignmentData(dom_assignment);
        this.assign_day_of_week = this.sa.assignment_date?.getDay();
        this.red_line_start_x = this.sa.fixed_mode ? 0 : this.sa.dynamic_start; // X-coordinate of the start of the red line
        this.red_line_start_y = this.sa.fixed_mode ? 0 : this.sa.works[this.red_line_start_x - this.sa.blue_line_start]; // Y-coordinate of the start of the red line
        this.min_work_time_funct_round = this.sa.min_work_time ? Math.ceil(this.sa.min_work_time / this.sa.funct_round) * this.sa.funct_round : this.sa.funct_round; // LCM of min_work_time and funct_round
        if (this.sa.unit) this.unit_is_of_time = ["minute", "hour"].includes(pluralize(this.sa.unit, 1).toLowerCase());
    }
    calcSkewRatioBound() {
        let x1 = this.sa.x;
        let y1 = this.sa.y;
        if (!y1) return 0;

        // this isn't always accurate with due times but i dont think anyone in the entire universe could care less; its 2 am and im tired and i just want to get an A on my physics exam im sorry but i realized after wasting like half an hour trying to find a goddamn solution that no user using timeweb will *ever* care at all that the skew ratio doesnt flatten out completely using arrow keys, in fact which users will even know that arrow keys exist, who the hell also cares about timeweb enough to actually use it, what am i doing with my life
        const mods = this.calcModDays();
        x1 -= Math.floor(x1 / 7) * this.sa.break_days.length + mods[x1 % 7];
        /*
        skew_ratio = (a + b) * x1 / y1; 
        skew_ratio = this.funct(1) * x1 / y1;
        skew_ratio = (y1+min_work_time_funct_round) * x1 / y1;
        */
        const skew_ratio_bound = mathUtils.precisionRound((y1 + this.min_work_time_funct_round) * x1 / y1, 10);
        return skew_ratio_bound;
    }
    setDynamicStart(params={ dont_ajax: false }) {
        const old_dynamic_start = this.sa.dynamic_start;
        const len_works = this.sa.works.length - 1;

        let low = this.sa.blue_line_start;
        let high = len_works + this.sa.blue_line_start;// - (len_works + this.sa.blue_line_start === this.sa.x); // If users enter a value >y on the last day dont change dynamic start because the graph may display info for the day after the due date; however this doesn't happen because the assignment is completed

        this.iter = 0;
        for (this.red_line_start_x = low; this.red_line_start_x <= high; this.red_line_start_x++) {
            this.red_line_start_y = this.sa.works[this.red_line_start_x - this.sa.blue_line_start];
            this.setParabolaValues();
            if (this.redLineStartXIsValid() || 
                // don't do the increment on the last iteration       
                this.red_line_start_x === high) break;

            if (this.iter > 20000) {
                low = this.red_line_start_x;
                while (low < high) {
                    const mid = Math.floor((low + high) / 2);
                    this.red_line_start_x = mid;
                    this.red_line_start_y = this.sa.works[this.red_line_start_x - this.sa.blue_line_start];
                    this.setParabolaValues();
        
                    if (this.redLineStartXIsValid()) {
                        high = mid;
                    } else {
                        low = mid + 1;
                    }
                }
                this.red_line_start_x = low;
                break;
            }
        }

        // high-first approach:

        // for (this.red_line_start_x = high - 1; this.red_line_start_x >= this.sa.blue_line_start; this.red_line_start_x--) {
        //     this.red_line_start_y = this.sa.works[this.red_line_start_x - this.sa.blue_line_start];
        //     this.setParabolaValues();
        //     if (!this.redLineStartXIsValid()) break;
        // }
        // // ++ for three cases:
        // // if for loop doesnt run, do ++ to fix red_line_start_x
        // // if for loop finds, do ++ because current red_line_start_x has the work input that isnt the same as todo
        // // if for loop doesnt find, do ++; red_line_start_x is less than blue_line_start which is illegal
        // this.red_line_start_x++;
        this.red_line_start_y = this.sa.works[this.red_line_start_x - this.sa.blue_line_start];
        this.sa.dynamic_start = this.red_line_start_x;

        // !this.sa.needs_more_info probably isn't needed but just in case as a safety mechanism for priority.js
        !params.dont_ajax && !this.sa.needs_more_info && old_dynamic_start !== this.sa.dynamic_start && ajaxUtils.batchRequest("saveAssignment", ajaxUtils.saveAssignment, {dynamic_start: this.sa.dynamic_start, id: this.sa.id});
        // If we don't call this again then the a and b values will be stuck at the binary search from when it was called in the earlier loop
        this.setParabolaValues();
    }
    redLineStartXIsValid() {
        // i MIGHT look into checking whether or not only the beginning of the blue line matches the red line
        // But I don't currently have any motive to do so (maybe performance if that becomes an issue or something)

        // checks if every work input is the same as the red line for all work inputs greater than red_line_start_x
        const len_works = this.sa.works.length - 1;
        let prev_funct = this.funct(len_works + this.sa.blue_line_start),
            prev_work = this.sa.works[len_works];
        for (let i = len_works + this.sa.blue_line_start; i > this.red_line_start_x; i--) {
            const this_funct = prev_funct,
                this_work = prev_work;
            prev_funct = this.funct(i - 1),
            prev_work = this.sa.works[i - this.sa.blue_line_start - 1];
            this.iter++;
            const valid = this_work === this_funct && prev_work === prev_funct;
            if (!valid) {
                return false;
            }
        }
        return true;

        // high-first approach
        // const len_works = this.sa.works.length - 1;
        // let next_funct = this.funct(this.red_line_start_x),
        //     next_work = this.sa.works[this.red_line_start_x - this.sa.blue_line_start];
        // for (let i = this.red_line_start_x; i < len_works + this.sa.blue_line_start; i++) {
        //     const this_funct = next_funct,
        //         this_work = next_work;
        //     next_funct = this.funct(i + 1),
        //     next_work = this.sa.works[i - this.sa.blue_line_start + 1];
        //     this.iter++;
        //     if (next_funct - this_funct !== next_work - this_work) {
        //         return false;
        //     }
        // }
        // return true;
    }
    shouldAutotune(params={ skip_break_days_check: false }) {
        const in_dynamic_mode = !this.sa.fixed_mode;
        if (!in_dynamic_mode) return false;

        let len_works = this.sa.works.length - 1;
        const mods = this.calcModDays();
        len_works -= Math.floor(len_works / 7) * this.sa.break_days.length + mods[(len_works + this.sa.blue_line_start) % 7];
        const too_many_work_inputs = len_works > Assignment.MAX_WORK_INPUTS_AUTOTUNE;
        if (too_many_work_inputs) return false;

        if (!params.skip_break_days_check) {
            // i dont want any work inputs whatsoever to have ANY effect on the curvature of the red line on a break day
            const on_break_day = this.sa.break_days.includes((this.assign_day_of_week + this.sa.blue_line_start + len_works - 1) % 7);
            if (on_break_day) return false;
        }

        return true;
    }
    // make sure to properly set red_line_start_x before running this function
    incrementDueDate() {
        this.sa.due_time = {hour: 0, minute: 0};
        do {
            this.sa.x++;
        } while (this.getWorkingDaysRemaining({ reference: "blue line end" }) === 0);
        this.sa.complete_x = this.sa.x;
        ajaxUtils.batchRequest("saveAssignment", ajaxUtils.saveAssignment, {due_time: this.sa.due_time, id: this.sa.id});

        const due_date = new Date(this.sa.assignment_date.valueOf());
        due_date.setDate(due_date.getDate() + this.sa.x);
        ajaxUtils.batchRequest("saveAssignment", ajaxUtils.saveAssignment, {x: due_date.getTime()/1000, id: this.sa.id});

        this.sa.alert_due_date_incremented = true;
        ajaxUtils.batchRequest("saveAssignment", ajaxUtils.saveAssignment, {alert_due_date_incremented: this.sa.alert_due_date_incremented, id: this.sa.id});
    }
    getWorkingDaysRemaining(params={reference: null, floor_due_time: false, diffcheck: false}) {
        if (params.diffcheck) {
            let working_days = 0;
            let diff;            
            let len_works = this.sa.works.length - 1;
            let i;
            switch (params.reference) {
                case "today": {
                    i = mathUtils.daysBetweenTwoDates(date_now, this.sa.assignment_date);
                    break;
                }
                case "blue line end":
                case "visual red line start": {
                    // First point the red line is drawn on, taken from draw()
                    // If in fixed mode, choose this anyways
                    i = this.sa.blue_line_start + len_works;
                    break;
                }
            }
            let this_funct;
            let next_funct = this.funct(i);
            if (next_funct === undefined || Number.isNaN(next_funct)) return NaN;
            for (; i < (params.floor_due_time ? Math.floor(this.sa.complete_x) : this.sa.x); i++) {
                if (this.sa.break_days.includes((this.assign_day_of_week + i) % 7)) {
                    continue;
                }

                this_funct = next_funct;
                // if the assignment is somehow invalid and this.red_line_start_y is ever undefined
                // from this.red_line_start_x being longer than this.sa.works, undefined values crash
                // sigFigSubtract. Return NaN to silently fail instead.
                next_funct = this.funct(i + 1);
                if (next_funct === undefined || Number.isNaN(next_funct)) return NaN;
                diff = mathUtils.sigFigSubtract(next_funct, this_funct);
                if (diff !== 0) {
                    working_days++;
                    if (next_funct === this.sa.y) {
                        break;
                    }
                }
            }
            return working_days;
        }
        const original_red_line_start_x = this.red_line_start_x;
        switch (params.reference) {
            case "today": {
                let today_minus_assignment_date = mathUtils.daysBetweenTwoDates(date_now, this.sa.assignment_date);
                this.red_line_start_x = today_minus_assignment_date;
                break;
            }
            case "blue line end": {
                let len_works = this.sa.works.length - 1;
                this.red_line_start_x = this.sa.blue_line_start + len_works;
                break;
            }
            case "visual red line start": {
                let len_works = this.sa.works.length - 1;
                // First point the red line is drawn on, taken from draw()
                this.red_line_start_x = this.sa.fixed_mode ? 0 : this.sa.blue_line_start + len_works;
                break;
            }
        }
        if (params.floor_due_time) {
            var x1 = Math.floor(this.sa.complete_x) - this.red_line_start_x;
        } else {
            var x1 = this.sa.x - this.red_line_start_x;
        }
        // note: this returns NaN when x1 is negative

        const mods = this.calcModDays();
        // dont apply the ceiling logic on other instances of this code because x1 will anyways always be an integer
        x1 -= Math.floor(x1 / 7) * this.sa.break_days.length + mods[x1 % 7];

        this.red_line_start_x = original_red_line_start_x;
        return x1;
    }
}
window.Assignment = Assignment;
class VisualAssignment extends Assignment {
    static CLOSE_ASSIGNMENT_TRANSITION_DURATION = 750 * SETTINGS.animation_speed
    static MOUSE_POSITION_TRANSFORM = {x: 0.1, y: -1.3} // Adjusts the mouse position by a few pixels to make it visually more accurate
    static RED_LINE_COLOR = {r: 233, g: 68, b: 46}
    static BLUE_LINE_COLOR = {r: 1, g: 147, b: 255}
    static MINIMUM_CIRCLE_Y = -1000
    static SKEW_RATIO_ROUND_PRECISION = 3
    static SKEW_RATIO_SNAP_DIFF = 0.05
    static ARROW_KEYDOWN_THRESHOLD = 500
    static ARROW_KEYDOWN_INTERVAL = 13
    static BUTTON_ERROR_DISPLAY_TIME = 1000
    static TOTAL_ARROW_SKEW_RATIO_STEPS = 100

    constructor(dom_assignment) {
        super(dom_assignment);
        this.dom_assignment = dom_assignment;
        this.graph = dom_assignment.find(".graph");
        this.fixed_graph = dom_assignment.find(".fixed-graph");
        this.set_skew_ratio_using_graph = false;
        this.draw_mouse_point = true;
        this.complete_due_date = new Date(this.sa.assignment_date.valueOf());
        this.complete_due_date.setDate(this.complete_due_date.getDate() + Math.floor(this.sa.complete_x));
        if (this.sa.due_time && (this.sa.due_time.hour || this.sa.due_time.minute)) {
            this.complete_due_date.setMinutes(this.complete_due_date.getMinutes() + this.sa.due_time.hour * 60 + this.sa.due_time.minute);
        }
        if (this.sa.assignment_date.getFullYear() === this.complete_due_date.getFullYear()) {
            this.date_string_options = {month: 'long', day: 'numeric', weekday: 'long'};
            this.date_string_options_no_weekday = {month: 'long', day: 'numeric'};
        } else {
            this.date_string_options = {year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'};
            this.date_string_options_no_weekday = {year: 'numeric', month: 'long', day: 'numeric'};
        }
        this.scale = window.devicePixelRatio || 2;
    }
    initUI() {
        const first_click = !this.dom_assignment.hasClass('has-been-clicked');
        this.dom_assignment.addClass("has-been-clicked");
        first_click && this.setGraphButtonEventListeners();
        this.resize();
        // setParabolaValues won't run in resize in fixed mode
        // Clicking the tick button before doing anything else on the page will then call .funct when setParabolaValues hasn't yet been ran
        // A solution could be to run setParabolaValues every time in resize but that feels like an avoidable performance hit
        // Instead run it if it hasn't yet at the end of initUI
        if (this.a === undefined) {
            this.setParabolaValues();
        }
    }
    resize(e={}) {
        // this method is still ran for assignments that have already been deleted, which messes up global VisualAssignment variables
        if (!document.contains(this.dom_assignment[0])) return;

        if (!this.sa.fixed_mode) {
            // Use sa because dynamic_start is changed in priority.js; needed to redefine starts
            this.red_line_start_x = this.sa.dynamic_start;
            this.red_line_start_y = this.sa.works[this.red_line_start_x - this.sa.blue_line_start];
        }
        this.scale = window.devicePixelRatio || 2; // Zoom in/out
        const assignment_footer = this.dom_assignment.find(".assignment-footer");
        if (assignment_footer.is(":visible")) {
            this.width = this.fixed_graph.width();
            this.height = this.fixed_graph.height();
        } else {
            assignment_footer.show();
            this.width = this.fixed_graph.width();
            this.height = this.fixed_graph.height();
            assignment_footer.hide();
        }
        this.wCon = (this.width - (VisualAssignment.GRAPH_Y_AXIS_MARGIN + 15)) / this.sa.complete_x;
        this.hCon = (this.height - 55) / this.sa.y;
        this.graph[0].width = this.width * this.scale;
        this.graph[0].height = this.height * this.scale;
        this.fixed_graph[0].width = this.width * this.scale;
        this.fixed_graph[0].height = this.height * this.scale;
        if (this.dom_assignment.hasClass("open-assignment") || this.dom_assignment.hasClass("assignment-is-closing")) {
            this.drawFixed();
            this.draw();
            // Don't hide graph hover point label on set skew ratio end if enabled
            if (!e.isTrigger) {
                const hover_point_label = this.dom_assignment.find(".hover-point-label");
                hover_point_label.removeClass("hide-label move-left").addClass("initial-position");
            }
        }
    }
    extractRawCoordinatesFromGraphMoveEvent(e) {
        return {
            raw_x: (e.pageX || e.touches?.[0]?.pageX || e.changedTouches?.[0]?.pageX) - this.fixed_graph.offset().left,
            raw_y: (e.pageY || e.touches?.[0]?.pageY || e.changedTouches?.[0]?.pageY) - this.fixed_graph.offset().top,
        }
    }
    static GRAPH_HOVER_EVENT = isTouchDevice ? "touchstart touchmove" : "mousemove";
    // Can't make this event passive on isTouchDevice because it calls e.preventDefault()
    mousemove(e, iteration_number=1) {
        const {raw_x, raw_y} = this.extractRawCoordinatesFromGraphMoveEvent(e);
        if (e.type === "touchstart" && (() => {
            // if the click isn't the same x coordinate
            let {mouse_x} = this.convertRawCoordsToGraphCoords(raw_x, raw_y);
            mouse_x = this.boundMouseXInDrawPoint(mouse_x);
            return this.last_mouse_x !== mouse_x;
        })()) {
            this.draw_mouse_point = true;
            this.allow_for_click_draw_point = true;
            setTimeout(() => {this.allow_for_click_draw_point = false}, 
                300 // approximate time to hold down such that it doesn't become a tap but instead a hold action
            );
        }
        if (e.type === "touchmove") {
            // FIXME: https://stackoverflow.com/questions/49500339/cant-prevent-touchmove-from-scrolling-window-on-ios
            e.preventDefault();
        }
        // If set skew ratio is enabled, make the third point (x2,y2)
        if (this.set_skew_ratio_using_graph && iteration_number !== Assignment.AUTOTUNE_ITERATIONS + 1 && Number.isFinite(raw_x) && Number.isFinite(raw_y)) {
            let x1 = this.sa.complete_x - this.red_line_start_x;
            let y1 = this.sa.y - this.red_line_start_y;

            const mods = this.calcModDays();
            x1 -= Math.floor((this.sa.x - this.red_line_start_x) / 7) * this.sa.break_days.length + mods[(this.sa.x - this.red_line_start_x) % 7];
            if (this.sa.break_days.includes((this.assign_day_of_week + Math.floor(this.sa.complete_x)) % 7)) {
                x1 = Math.ceil(x1);
            }

            // (x2,y2) are the raw coordinates of the graoh
            // This converts the raw coordinates to graph coordinates, which match the steps on the x and y axes
            let x2 = this.convertRawCoordsToGraphCoords(raw_x, raw_y).mouse_x;
            let y2 = this.convertRawCoordsToGraphCoords(raw_x, raw_y).mouse_y;
            x2 -= this.red_line_start_x;
            y2 -= this.red_line_start_y + (this.sa.y - this.red_line_start_y) % this.sa.funct_round;

            // i don't think ceiling logic is needed here because it seems to work as intended without it
            const floorx2 = Math.floor(x2);
            if (this.sa.break_days.includes((this.assign_day_of_week + floorx2 + this.red_line_start_x) % 7)) {
                x2 = floorx2;
            }
            x2 -= Math.floor(x2 / 7) * this.sa.break_days.length + mods[floorx2 % 7];

            const skew_ratio_bound = this.calcSkewRatioBound();
            // If the mouse is outside the graph to the left or right, ignore it
            // x2 can be NaN from being outside of the graph caused by negative indexing by floorx2. Doesn't matter if this happens
            if (0 < x2 && x2 < x1) {
                // If the parabola is being set by the graph, connect (0,0), (x1,y1), (x2,y2)
                const parabola = this.calcAandBfromOriginAndTwoPoints([x2, y2], [x1, y1]);
                this.a = parabola.a;
                this.b = parabola.b;
                
                // Redefine skew ratio
                this.sa.skew_ratio = mathUtils.clamp(2 - skew_ratio_bound, (this.a + this.b) * x1 / y1, skew_ratio_bound);
                if (Math.abs(Math.round(this.sa.skew_ratio) - this.sa.skew_ratio) < VisualAssignment.SKEW_RATIO_SNAP_DIFF) {
                    // Snap skew ratio to whole numbers
                    this.sa.skew_ratio = Math.round(this.sa.skew_ratio);
                }
            } else if (0 >= x2) {
                this.sa.skew_ratio = skew_ratio_bound;
            } else if (x2 >= x1) {
                this.sa.skew_ratio = 2 - skew_ratio_bound;
            }
            if (!this.sa.fixed_mode)
                this.setDynamicStart({ dont_ajax: true });
            this.mousemove(e, iteration_number + 1);
        } else {
            this.draw(raw_x, raw_y);
        }
    }
    arrowSkewRatio() {
        /**
         * Line: y = ax + b
         * y1 = y - this.red_line_start_y
         * x1 = (complete_x - this.red_line_start_x)
         * y = x(y1/x1)
         * inverse:
         * y = y1-x(y1/x1)
         * inverse it:
         * 
         * Parabola: y = ax^2 + bx
         * y = ax^2 + bx
         * 
         * Solve for x:
         * y1-x(y1/x1) = ax^2 + bx
         * 0 = ax^2 + xb - x(y1)/(x1) - y1
         * 0 = ax^2 + (y1/x1 - b)x - y1
         * a = a
         * b = b + y1/x1
         * c = -y1
         * result = (-b +- Math.sqrt(Math.pow(b, 2) - (4 * a * c))) / (2 * a);
         * result = (-(y1/x1 - b) +- Math.sqrt(Math.pow(y1/x1 - b, 2) - (4 * a * -y1))) / (2 * a);
         * by playing with this https://www.desmos.com/calculator/urjcy3zcua we can see to always use plus
         */
        let x1 = this.sa.complete_x - this.red_line_start_x;
        let y1 = this.sa.y - this.red_line_start_y;

        const mods = this.calcModDays();
        x1 -= Math.floor((this.sa.x - this.red_line_start_x) / 7) * this.sa.break_days.length + mods[(this.sa.x - this.red_line_start_x) % 7];
        if (this.sa.break_days.includes((this.assign_day_of_week + Math.floor(this.sa.complete_x)) % 7)) {
            x1 = Math.ceil(x1);
        }

        let a = this.a;
        let b = this.b + y1/x1;
        let c = -y1;
        if (a)
            var intersection_x = (-b + Math.sqrt(Math.pow(b, 2) - (4 * a * c))) / (2 * a);
        else
            // y = y1 - x(y1/x1)
            // y = (y1/x1)x
            // (y1/x1)x = y1 - x(y1/x1)
            // 2 x y1 = y1 x1
            // 2 x = x1
            // x = x1 / 2
            var intersection_x = x1 / 2;
        const original_skew_ratio = this.sa.skew_ratio;
        let x_step = x1 / VisualAssignment.TOTAL_ARROW_SKEW_RATIO_STEPS;
        if (intersection_x !== x1 / 2 &&
            (this.pressed_arrow_key === "ArrowDown" && x1 / 2 - x_step / 2 < intersection_x && intersection_x < x1 / 2 
            || this.pressed_arrow_key === "ArrowUp" && x1 / 2 < intersection_x && intersection_x < x1 / 2 + x_step / 2)) {
            // if the curvature is something like 0.001 and the user presses arrow down or
            // the curvature is something like -0.001 and the user presses arrow up
            // go to 0
            this.sa.skew_ratio = 1;
        } else {
            intersection_x = x_step * Math.round(intersection_x / x_step);
            if (this.pressed_arrow_key === "ArrowUp")
                var next_intersection_x = intersection_x - x_step;
            else if (this.pressed_arrow_key === "ArrowDown")
                var next_intersection_x = intersection_x + x_step;
            
            // plug in next_intersection_x as x into y = y1 - x(y1/x1)
            let next_intersection = [next_intersection_x, y1 - next_intersection_x * y1/x1];
            let parabola = this.calcAandBfromOriginAndTwoPoints(next_intersection, [x1, y1]);

            this.sa.skew_ratio = (parabola.a + parabola.b) * x1 / y1;
        }

        const skew_ratio_bound = this.calcSkewRatioBound();
        // use original_skew_ratio to allow one more arrow before bound so the parabols completely flattens
        // add && or else holding down will cause themselves to trigger each other in an infinite loop
        if ((original_skew_ratio >= skew_ratio_bound || next_intersection_x === 0) && this.pressed_arrow_key === "ArrowUp") {
            this.sa.skew_ratio = 2 - skew_ratio_bound;
        } else if ((original_skew_ratio <= 2 - skew_ratio_bound || next_intersection_x === x1) && this.pressed_arrow_key === "ArrowDown") {
            this.sa.skew_ratio = skew_ratio_bound;
        }
        if (!this.sa.fixed_mode)
            this.setDynamicStart();
        ajaxUtils.batchRequest("saveAssignment", ajaxUtils.saveAssignment, {skew_ratio: this.sa.skew_ratio, id: this.sa.id});
        new Priority().sort();
    }
    static generateCanvasFont = font_size => `${$("body").css("font-weight")} ${font_size}px Open Sans`;
    static getTextHeight = screen => screen.measureText("0").width * 2;
    static setCanvasFont(screen, font_size) {
        screen.font = VisualAssignment.generateCanvasFont(font_size);
        screen.text_height = VisualAssignment.getTextHeight(screen);
    }
    convertRawCoordsToGraphCoords(raw_x, raw_y) {
        return {
            mouse_x: (raw_x - (VisualAssignment.GRAPH_Y_AXIS_MARGIN + 10 + VisualAssignment.MOUSE_POSITION_TRANSFORM.x)) / this.wCon,
            mouse_y: (this.height - raw_y - (50 + VisualAssignment.MOUSE_POSITION_TRANSFORM.y)) / this.hCon,
        }
    }
    boundMouseXInDrawPoint(mouse_x) {
        if (mouse_x >= (Math.round(mouse_x) + this.sa.complete_x) / 2)
            mouse_x = this.sa.x;
        else
            mouse_x = Math.round(mouse_x);
        if (mouse_x < Math.min(this.red_line_start_x, this.sa.blue_line_start))
            mouse_x = Math.min(this.red_line_start_x, this.sa.blue_line_start);
        else if (mouse_x > this.sa.x)
            mouse_x = this.sa.x;
        return mouse_x;
    }
    getDefaultFontColor() { return this.fixed_graph.css("filter") === "none" ? "black" : "white"; }
    //hard (this entire function)
    draw(raw_x, raw_y) {
        // #assignments-container scrollbar may take up width when assignment is opened
        // Not sure exactly when this happens but for the time it did happen I confirmed that
        // this fixed the issue
        if (this.width !== this.fixed_graph.width()) {
            this.resize();
            return;
        }
        const len_works = this.sa.works.length - 1;
        const last_work_input = this.sa.works[len_works];
        const today_minus_assignment_date = mathUtils.daysBetweenTwoDates(date_now, this.sa.assignment_date);
        const assignment_container = this.dom_assignment.parents(".assignment-container");

        // draw() always runs setParabolaValues but I'll leave it like this because it's easier to maintain and for forward compatibility
        this.setParabolaValues();

        // Number.isFinite(raw_x) && Number.isFinite(raw_y) is needed because resize() can call draw() while draw_mouse_point is true but not pass any mouse coordinates, from for example resizing the browser
        if (this.draw_mouse_point && Number.isFinite(raw_x) && Number.isFinite(raw_y)) {
            var {mouse_x, mouse_y} = this.convertRawCoordsToGraphCoords(raw_x, raw_y);
            mouse_x = this.boundMouseXInDrawPoint(mouse_x);
            let draw_at_works;
            if (this.sa.blue_line_start <= mouse_x && mouse_x <= len_works + this.sa.blue_line_start) {
                if (Math.ceil(mouse_x) < this.red_line_start_x) {
                    draw_at_works = true;
                } else {
                    draw_at_works = Math.abs(mouse_y - this.funct(mouse_x)) > Math.abs(mouse_y - this.sa.works[mouse_x - this.sa.blue_line_start]);
                }
            } else {
                draw_at_works = false;
            }
            if (!this.set_skew_ratio_using_graph && this.last_mouse_x === mouse_x && this.last_draw_at_works === draw_at_works) {
                return;
            }
            if (draw_at_works) {
                var funct_mouse_x = this.sa.works[mouse_x - this.sa.blue_line_start];
            } else {
                var funct_mouse_x = this.funct(mouse_x);
            }
            this.last_mouse_x = mouse_x;
            this.last_draw_at_works = draw_at_works;
        }
        const screen = this.graph[0].getContext("2d");
        screen.scale(this.scale, this.scale);
        screen.clearRect(0, 0, this.width, this.height);

        const rounded_skew_ratio = mathUtils.precisionRound(this.sa.skew_ratio - 1, VisualAssignment.SKEW_RATIO_ROUND_PRECISION);
        screen.textAlign = "end";
        screen.fillStyle = this.getDefaultFontColor();
        VisualAssignment.setCanvasFont(screen, 15);
        screen.fillText(`Curvature: ${rounded_skew_ratio}${rounded_skew_ratio ? "" : " (Linear)"}`, this.width-2, this.height-148+72);
        screen.fillText(this.sa.fixed_mode ? "Fixed Mode" : "Dynamic Mode", this.width-2, this.height-129+72);
        let radius = this.wCon / 3;
        if (radius > 3) {
            radius = 3;
        } else if (radius < 2) {
            radius = 2;
        }

        let circle_x,
            circle_y,
            line_end = this.sa.complete_x + Math.ceil(1 / this.wCon);
        screen.strokeStyle = utils.formatting.RGBToString(VisualAssignment.RED_LINE_COLOR);
        screen.lineWidth = radius;
        screen.beginPath();
        for (let point_x = /*(*/this.sa.fixed_mode/* || DEBUG)*/ ? this.red_line_start_x : this.sa.blue_line_start + len_works; point_x < line_end; point_x += Math.ceil(1 / this.wCon)) {
            let point_y = this.funct(point_x);
            circle_x = point_x * this.wCon + VisualAssignment.GRAPH_Y_AXIS_MARGIN + 10;
            if (circle_x > this.width - 5) {
                circle_x = this.width - 5;
            }
            circle_y = Math.max(VisualAssignment.MINIMUM_CIRCLE_Y, this.height - point_y * this.hCon - 50);
            screen.lineTo(circle_x - (point_x === this.red_line_start_x) * radius / 2, circle_y); // (point_x === this.red_line_start_x) * radius / 2 makes sure the first point is filled in properly
            screen.arc(circle_x, circle_y, radius, 0, 2 * Math.PI)
            screen.moveTo(circle_x, circle_y);
        }
        screen.stroke();
        screen.beginPath();
        radius *= 0.75;
        line_end = Math.min(line_end, len_works + Math.ceil(1 / this.wCon));
        screen.strokeStyle = utils.formatting.RGBToString(VisualAssignment.BLUE_LINE_COLOR);
        screen.lineWidth = radius;
        for (let point_x = 0; point_x < line_end; point_x += Math.ceil(1 / this.wCon)) {
            let point_y = this.sa.works[Math.min(len_works, point_x)];
            circle_x = Math.min(this.sa.complete_x, point_x + this.sa.blue_line_start) * this.wCon + VisualAssignment.GRAPH_Y_AXIS_MARGIN + 10;
            circle_y = Math.max(VisualAssignment.MINIMUM_CIRCLE_Y, this.height - point_y * this.hCon - 50);
            
            screen.lineTo(circle_x - (point_x === 0) * radius / 2, circle_y);
            screen.arc(circle_x, circle_y, radius, 0, 2 * Math.PI);
            screen.moveTo(circle_x, circle_y);
        }
        radius /= 0.75;
        screen.stroke();
        const hover_point_label = this.dom_assignment.find(".hover-point-label");
        VisualAssignment.setCanvasFont(screen, parseFloat($(".hover-point-label").first().css("font-size")));
        if (this.draw_mouse_point && Number.isFinite(raw_x) && Number.isFinite(raw_y)) {
            let str_mouse_x;
            let graph_mouse_x;
            if (mouse_x === this.sa.x && this.sa.due_time && (this.sa.due_time.hour || this.sa.due_time.minute)) {
                str_mouse_x = new Date(this.complete_due_date.valueOf());
                str_mouse_x = str_mouse_x.toLocaleDateString([], {...this.date_string_options_no_weekday, hour: "numeric", minute: "numeric"});
                graph_mouse_x = this.sa.complete_x;
            } else {
                str_mouse_x = new Date(this.sa.assignment_date.valueOf());
                str_mouse_x.setDate(str_mouse_x.getDate() + mouse_x);
                str_mouse_x = str_mouse_x.toLocaleDateString([], this.date_string_options_no_weekday);
                graph_mouse_x = mouse_x;
            }
            const point_x = graph_mouse_x * this.wCon + VisualAssignment.GRAPH_Y_AXIS_MARGIN + 10;
            const point_y = Math.max(VisualAssignment.MINIMUM_CIRCLE_Y, this.height - funct_mouse_x * this.hCon - 50);
            // converting from minutes to hours can result in hidden decimal places, so we round so the user isnt overwhelmed
            const point_str = `(Day: ${str_mouse_x}, ${pluralize(this.sa.unit,1)}: ${Math.floor(funct_mouse_x * 100) / 100})`;
            if (hover_point_label.hasClass("initial-position")) {
                hover_point_label.addClass("disable-hover-point-label-transition");
            }
            hover_point_label.removeClass("hide-label");
            hover_point_label.css("--x", point_x);
            hover_point_label.css("--y", point_y);
            hover_point_label.text(point_str);
            hover_point_label.toggleClass("move-left", point_x + screen.measureText(point_str).width + 8 > this.width - 5);
            if (hover_point_label.hasClass("initial-position")) {
                hover_point_label[0].offsetHeight;
                hover_point_label.removeClass("disable-hover-point-label-transition initial-position");
            }
            screen.beginPath();

            if (this.sa.works[mouse_x - this.sa.blue_line_start] === funct_mouse_x) {
                screen.strokeStyle = utils.formatting.RGBToString(VisualAssignment.BLUE_LINE_COLOR);
            } else if (this.funct(mouse_x) === funct_mouse_x) {
                screen.strokeStyle = utils.formatting.RGBToString(VisualAssignment.RED_LINE_COLOR);
            }
            
            screen.fillStyle = "white";
            screen.arc(point_x, point_y, radius + 2, 0, 2 * Math.PI);
            screen.fill();
            screen.lineWidth = 2;
            screen.stroke();
            screen.fillStyle = this.getDefaultFontColor();
        // isTouchDevice condition because setting skew ratio while hover point is enabled causes this to be ran because raw_x is NaN and for the hover point to disappear
        } else if (isTouchDevice) {
            hover_point_label.addClass("hide-label");
            this.draw_mouse_point = false;
        }
        
        screen.textAlign = "center";
        const center = (str, y_pos) => screen.fillText(str, (VisualAssignment.GRAPH_Y_AXIS_MARGIN+10+this.width)/2, screen.text_height * y_pos - 2);
        if (!assignment_container.hasClass("finished")) {
            let displayed_day;
            let str_day;
            if (this.sa.blue_line_start + len_works === this.sa.x && this.sa.due_time && (this.sa.due_time.hour || this.sa.due_time.minute)) {
                displayed_day = new Date(this.complete_due_date.valueOf());
                str_day = displayed_day.toLocaleDateString([], {...this.date_string_options, hour: "numeric", minute: "numeric"});
            } else {
                displayed_day = new Date(this.sa.assignment_date.valueOf());
                displayed_day.setDate(displayed_day.getDate() + this.sa.blue_line_start + len_works);
                str_day = displayed_day.toLocaleDateString([], this.date_string_options);
            }
            const distance_today_from_displayed_day = today_minus_assignment_date - this.sa.blue_line_start - len_works;
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

            let todo = mathUtils.precisionRound(this.funct(len_works + this.sa.blue_line_start + 1) - last_work_input, 10);
            if (todo < 0 || this.sa.break_days.includes((this.assign_day_of_week + this.sa.blue_line_start + len_works) % 7)) {
                todo = 0;
            }

            if (displayed_day.valueOf() !== date_now.valueOf()) {
                center(str_day + ":", 1);
                center(Priority.generate_UNFINISHED_FOR_TODAY_status_message(todo, last_work_input, this, false), 2);
            }
        }
        screen.scale(1 / this.scale, 1 / this.scale);
    }
    static GRAPH_Y_AXIS_MARGIN = 55;
    static SMALLER_SMALLER_MARGIN_X = 11;
    static SMALLER_BIGGER_MARGIN_X = 7;
    static BIGGER_BIGGER_MARGIN_X = 19;
    static SMALLER_SMALLER_MARGIN_Y = 6;
    static SMALLER_BIGGER_MARGIN_Y = 2;
    static BIGGER_BIGGER_MARGIN_Y = 7;
    //hard (the entire function)
    drawFixed() {
        const screen = this.fixed_graph[0].getContext("2d");
        screen.scale(this.scale, this.scale);
        let gradient = screen.createLinearGradient(0, 0, 0, this.height * 4 / 3);
        gradient.addColorStop(0, "white");
        gradient.addColorStop(1, "hsl(0, 0%, 83%)");
        screen.fillStyle = gradient;
        screen.fillRect(0, 0, this.width, this.height * 4 / 3);

        // x and y axis rectangles
        screen.fillStyle = "rgb(185,185,185)";
        screen.fillRect(VisualAssignment.GRAPH_Y_AXIS_MARGIN, 0, 10, this.height);
        screen.fillRect(0, this.height - 50, this.width, 10);

        // x axis label
        screen.fillStyle = "black";
        screen.textAlign = "center";
        VisualAssignment.setCanvasFont(screen, 17.1875);
        screen.fillText("Days", this.width / 2, this.height - 5);

        // y axis label
        screen.rotate(-Math.PI / 2);
        if (this.unit_is_of_time) {
            const plural = pluralize(this.sa.unit);
            var text = `${plural[0].toUpperCase() + plural.substring(1).toLowerCase()} of Work`;
        } else {
            var text = `${pluralize(this.sa.unit)} (${utils.formatting.formatMinutes(this.sa.time_per_unit)} per ${pluralize(this.sa.unit,1)})`;
        }
        let vertical_text_margin = 20;
        if (screen.measureText(text).width + vertical_text_margin * 2 > this.height - 50) {
            text = pluralize(this.sa.unit);
        }
        screen.fillText(text, -(this.height - 50) / 2, 17);
        screen.rotate(Math.PI / 2);

        VisualAssignment.setCanvasFont(screen, 13.75);
        const rounded_complete_x = Math.max(Math.floor(this.sa.complete_x * 100), 1) / 100;
        const x_axis_scale = Math.pow(10, Math.floor(Math.log10(this.sa.complete_x))) * Math.ceil(this.sa.complete_x.toString()[0] / Math.ceil((this.width - (VisualAssignment.GRAPH_Y_AXIS_MARGIN + 15)) / 150));
        const draw_big_index_at_complete_x = this.sa.complete_x % x_axis_scale === 0 || this.sa.complete_x < 10;
        const small_x_axis_scale = x_axis_scale / 5;
        const label_smaller_x_indicies = screen.measureText(Math.floor(this.sa.complete_x)).width * 1.9 < small_x_axis_scale * this.wCon;
        let small_last_number_left;
        if (this.sa.complete_x >= 10) {
            gradient = screen.createLinearGradient(0, 0, 0, this.height * 4 / 3);
            gradient.addColorStop(0, "gainsboro");
            gradient.addColorStop(1, "silver");

            /**
                mod x_axis_scale is 0
                mod small_x_axis_scale is 0
                (x=20)
                +-----+-------+------------+---------------+
                |     |       |            | Label size    |
                +-----+-------+------------+---------------+
                |     |       | big        | small         |
                +-----+-------+------------+---------------+
                |     | int   | x=8: big   | x=20: big     |
                +-----+-------+------------+---------------+
                | Day | float | impossible | impossible    |
                +-----+-------+------------+---------------+

                (IMPOSSIBLE)
                mod x_axis_scale is 0
                mod small_x_axis_scale is 0

                mod x_axis_scale is non-0
                mod small_x_axis_scale is 0 or non-0
                (x=13)
                +-----+-------+------------+---------------+
                |     |       |            | Label size    |
                +-----+-------+------------+---------------+
                |     |       | big        | small         |
                +-----+-------+------------+---------------+
                |     | int   | impossible | x=13: small   |
                +-----+-------+------------+---------------+
                | Day | float | x=7.5: big | x=13.5: small |
                +-----+-------+------------+---------------+
                logic: if mod x_axis_scale == 0: big, elif x < 10: big, else: small
            */

            let smaller_index;
            let number_x_pos;
            let numberwidth;

            if (!draw_big_index_at_complete_x) {
                smaller_index = rounded_complete_x;
                // don't include `if (smaller_index / small_x_axis_scale % 5 !== 0) {` due to the following logic:

                // smaller_index / small_x_axis_scale % 5
                // =5 * smaller_index / x_axis_scale % 5
                // =Number.isInteger(smaller_index / x_axis_scale)
                // =Number.isInteger(this.sa.complete_x / x_axis_scale)
                // =this.sa.complete_x / x_axis_scale % 1 === 0
                // =this.sa.complete_x % x_axis_scale === 0
                // =draw_big_index_at_complete_x
                screen.fillStyle = gradient; // Line color
                screen.fillRect(smaller_index * this.wCon + VisualAssignment.GRAPH_Y_AXIS_MARGIN + 8.5, 0, 2, this.height - 50);
                // we don't care if nothing else is drawn, we need to draw the due date label
                // if (label_smaller_x_indicies) {
                numberwidth = screen.measureText(smaller_index).width;
                number_x_pos = this.width - numberwidth / 2 - 2.5;
                screen.fillStyle = "rgb(80,80,80)"; // Number color
                screen.fillText(smaller_index, number_x_pos, this.height - 10 - 17);
                small_last_number_left = number_x_pos - numberwidth / 2;
                // }
                // }
            }
            let first_loop = true;
            for (smaller_index = Math.ceil(this.sa.complete_x / small_x_axis_scale - 1) * small_x_axis_scale; smaller_index > 0; smaller_index -= small_x_axis_scale) {
                if (smaller_index / small_x_axis_scale % 5 === 0) continue

                number_x_pos = smaller_index * this.wCon + VisualAssignment.GRAPH_Y_AXIS_MARGIN + 10;
                screen.fillStyle = gradient; // Line color
                screen.fillRect(number_x_pos - 1.5, 0, 2, this.height - 50); // Draws line index
                if (!label_smaller_x_indicies) continue;

                if (!first_loop) {
                    screen.fillStyle = "rgb(80,80,80)"; // Number color
                    screen.fillText(smaller_index, number_x_pos, this.height - 10 - 17);
                    continue;
                }

                numberwidth = screen.measureText(smaller_index).width;
                if (draw_big_index_at_complete_x) {
                    small_last_number_left = number_x_pos - numberwidth / 2;
                    screen.fillStyle = "rgb(80,80,80)"; // Number color
                    screen.fillText(smaller_index, number_x_pos, this.height - 10 - 17);
                } else if (small_last_number_left - (number_x_pos + numberwidth / 2) > VisualAssignment.SMALLER_SMALLER_MARGIN_X) {
                    screen.fillStyle = "rgb(80,80,80)"; // Number color
                    screen.fillText(smaller_index, number_x_pos, this.height - 10 - 17);
                }
                first_loop = false;
            }
        }
        VisualAssignment.setCanvasFont(screen, 12);
        screen.textAlign = "right";

        const y_axis_scale = Math.pow(10, Math.floor(Math.log10(this.sa.y))) * Math.ceil(this.sa.y.toString()[0] / Math.ceil((this.height - 55) / 125));
        const draw_big_index_at_y = this.sa.y % y_axis_scale === 0 || this.sa.y < 10;
        const small_y_axis_scale = y_axis_scale / 5;
        const label_smaller_y_indicies = screen.text_height * 2.1 < small_y_axis_scale * this.hCon;
        let small_last_number_bottom;
        if (this.sa.y >= 10) {
            let smaller_index;
            let number_y_pos;

            if (!draw_big_index_at_y) {
                smaller_index = this.sa.y;

                const gradient_percent = 1 - (smaller_index * this.hCon) / (this.height - 50);
                screen.fillStyle = `rgb(${220-16*gradient_percent},${220-16*gradient_percent},${220-16*gradient_percent})`;
                screen.fillRect(VisualAssignment.GRAPH_Y_AXIS_MARGIN + 10, this.height - smaller_index * this.hCon - 51.5, this.width - 50, 2);
                
                number_y_pos = 4;
                screen.fillStyle = "rgb(80,80,80)";
                screen.fillText(smaller_index, VisualAssignment.GRAPH_Y_AXIS_MARGIN - 2, number_y_pos + screen.text_height / 2);
                small_last_number_bottom = number_y_pos + screen.text_height / 2;
            }
            let first_loop = true;
            for (let smaller_index = Math.ceil(this.sa.y / small_y_axis_scale - 1) * small_y_axis_scale; smaller_index > 0; smaller_index -= small_y_axis_scale) {
                if (smaller_index / small_y_axis_scale % 5 === 0) continue;

                const gradient_percent = 1 - (smaller_index * this.hCon) / (this.height - 50);
                number_y_pos = this.height - smaller_index * this.hCon - 54;
                screen.fillStyle = `rgb(${220-16*gradient_percent},${220-16*gradient_percent},${220-16*gradient_percent})`;
                screen.fillRect(VisualAssignment.GRAPH_Y_AXIS_MARGIN + 10, number_y_pos + 2.5, this.width - 50, 2);
                if (!label_smaller_y_indicies) continue;
                
                if (!first_loop) {
                    screen.fillStyle = "rgb(80,80,80)";
                    screen.fillText(smaller_index, VisualAssignment.GRAPH_Y_AXIS_MARGIN - 2, number_y_pos + screen.text_height / 2);
                    continue;
                }

                if (draw_big_index_at_y) {
                    small_last_number_bottom = number_y_pos + screen.text_height / 2;
                    screen.fillStyle = "rgb(80,80,80)";
                    screen.fillText(smaller_index, VisualAssignment.GRAPH_Y_AXIS_MARGIN - 2, number_y_pos + screen.text_height / 2);
                } else if ((number_y_pos - screen.text_height / 2) - small_last_number_bottom > VisualAssignment.SMALLER_SMALLER_MARGIN_Y) {
                    screen.fillStyle = "rgb(80,80,80)";
                    screen.fillText(smaller_index, VisualAssignment.GRAPH_Y_AXIS_MARGIN - 2, number_y_pos + screen.text_height / 2);
                }
                first_loop = false;
            }
        }
        VisualAssignment.setCanvasFont(screen, label_smaller_y_indicies ? 15 : 16.5);
        {
            let bigger_index;
            let number_y_pos;
            let last_number_bottom;

            if (draw_big_index_at_y) {
                bigger_index = this.sa.y;
                screen.fillStyle = "rgb(205,205,205)";
                screen.fillRect(VisualAssignment.GRAPH_Y_AXIS_MARGIN + 10, this.height - bigger_index * this.hCon - 52.5, this.width - 50, 5);
                number_y_pos = 5;
                screen.fillStyle = "black";
                screen.fillText(bigger_index, VisualAssignment.GRAPH_Y_AXIS_MARGIN - 2, number_y_pos + screen.text_height / 2);
                last_number_bottom = number_y_pos + screen.text_height / 2;
            }
            let first_loop = true;
            for (bigger_index = Math.ceil(this.sa.y / y_axis_scale - 1) * y_axis_scale; bigger_index > 0; bigger_index -= y_axis_scale) {
                number_y_pos = this.height - bigger_index * this.hCon - 54;
                screen.fillStyle = "rgb(205,205,205)";
                screen.fillRect(VisualAssignment.GRAPH_Y_AXIS_MARGIN + 10, number_y_pos + 1.5, this.width - 50, 5);

                if (!first_loop) {
                    screen.fillStyle = "black";
                    screen.fillText(bigger_index, VisualAssignment.GRAPH_Y_AXIS_MARGIN - 2, number_y_pos + screen.text_height / 2);
                    continue;
                }

                if (
                    (
                        small_last_number_bottom === undefined || 
                        (number_y_pos - screen.text_height / 2) - small_last_number_bottom > VisualAssignment.SMALLER_BIGGER_MARGIN_Y
                    ) && (
                        !draw_big_index_at_y ||
                        (number_y_pos - screen.text_height / 2) - last_number_bottom > VisualAssignment.BIGGER_BIGGER_MARGIN_Y
                    )
                ) {
                    screen.fillStyle = "black";
                    screen.fillText(bigger_index, VisualAssignment.GRAPH_Y_AXIS_MARGIN - 2, number_y_pos + screen.text_height / 2);
                }
                first_loop = false;
            }
        }
        screen.fillStyle = "black";
        screen.fillText("0", VisualAssignment.GRAPH_Y_AXIS_MARGIN - 2, this.height - 53.5);

        screen.textAlign = "center";
        VisualAssignment.setCanvasFont(screen, 16.5);
        {
            let bigger_index;
            let number_x_pos;
            let numberwidth;
            let last_number_left;

            if (draw_big_index_at_complete_x) {
                bigger_index = rounded_complete_x;
                screen.fillStyle = "rgb(205,205,205)";
                screen.fillRect(this.sa.complete_x * this.wCon + (VisualAssignment.GRAPH_Y_AXIS_MARGIN + 7.5), 0, 5, this.height - 50);
                numberwidth = screen.measureText(bigger_index).width;
                number_x_pos = this.width - numberwidth / 2 - 2;
                screen.fillStyle = "black";
                screen.fillText(bigger_index, number_x_pos, this.height - 40 + 15);
                last_number_left = number_x_pos - numberwidth / 2;
            }
            let first_loop = true;
            for (bigger_index = Math.ceil(this.sa.complete_x / x_axis_scale - 1) * x_axis_scale; bigger_index > 0; bigger_index -= x_axis_scale) {
                number_x_pos = bigger_index * this.wCon + (VisualAssignment.GRAPH_Y_AXIS_MARGIN + 10);
                screen.fillStyle = "rgb(205,205,205)";
                screen.fillRect(number_x_pos - 2.5, 0, 5, this.height - 50);

                if (!first_loop) {
                    screen.fillStyle = "black";
                    screen.fillText(bigger_index, number_x_pos, this.height - 40 + 15);
                    continue;
                }

                numberwidth = screen.measureText(bigger_index).width;
                if (
                    (
                        small_last_number_left === undefined || // small_last_number_left has an opportunity to be defined despite the evaluation of draw_big_index_at_complete_x
                        small_last_number_left - (number_x_pos + numberwidth / 2) > VisualAssignment.SMALLER_BIGGER_MARGIN_X
                    ) && (

                        !draw_big_index_at_complete_x ||
                        last_number_left - (number_x_pos + numberwidth / 2) > VisualAssignment.BIGGER_BIGGER_MARGIN_X
                    )
                ) {
                    screen.fillStyle = "black";
                    screen.fillText(bigger_index, number_x_pos, this.height - 40 + 15);
                }
                first_loop = false;
            }
        }
        screen.fillStyle = "black";
        screen.fillText("0", VisualAssignment.GRAPH_Y_AXIS_MARGIN + 16.5, this.height - 40 + 15);
        const today_minus_assignment_date = mathUtils.daysBetweenTwoDates(utils.getRawDateNow(), this.sa.assignment_date, {round: false});
        if (today_minus_assignment_date >= 0 && today_minus_assignment_date <= this.sa.complete_x) {
            let today_x = today_minus_assignment_date * this.wCon + (VisualAssignment.GRAPH_Y_AXIS_MARGIN + 7.5);
            // Ensures the today line doesn't get too close to a red point so it's easier to figure out which day it is
            let today_x_line_left_offset = today_minus_assignment_date * this.wCon + 11;
            let nearest_x_step = Math.ceil(today_minus_assignment_date) * this.wCon
            if (nearest_x_step < today_x_line_left_offset) {
                // Subtract by how much it exeeds nearest_x_step
                today_x -= today_x_line_left_offset - nearest_x_step;
                // Ensure the today line doesn't go before today's date to yesterday
                if (today_x < Math.floor(today_minus_assignment_date) * this.wCon + (VisualAssignment.GRAPH_Y_AXIS_MARGIN + 7.5)) {
                    today_x = Math.floor(today_minus_assignment_date) * this.wCon + (VisualAssignment.GRAPH_Y_AXIS_MARGIN + 7.5);
                }
            }
            // check isn't needed due to the above code but let's put this here for forward compatibility
            if (today_x > this.width - 12.5) {
                today_x = this.width - 12.5;
            }
            screen.fillStyle = "rgb(205,205,205)";
            screen.fillRect(today_x, 0, 5, this.height - 50);
            screen.fillStyle = "black";
            screen.rotate(Math.PI / 2);
            screen.textAlign = "center";
            VisualAssignment.setCanvasFont(screen, 17.1875);
            screen.fillText("Today Line", (this.height - 50)/2, -today_x + 2);
            screen.rotate(-Math.PI / 2);
        }
    }
    assignmentGraphIsOnScreen() {
        const rect = this.fixed_graph[0].getBoundingClientRect();
        // Makes sure graph is on screen
        return rect.bottom - rect.height / 1.5 > 70 && rect.y + rect.height / 1.5 < window.innerHeight;
    }
    static IDGeneratorCounter = 0
    static notApplicableTimeouts = {}
    static flashNotApplicable($graph_button) {
        
        switch ($graph_button.prop("tagName").toLowerCase()) {
            case "button":
                var original_text = $graph_button.text();
                $graph_button.text("Not Applicable");
                break;
            case "input":
                var original_text = $graph_button.attr("placeholder");
                $graph_button.val("").attr("placeholder", "Not Applicable");
                break;
        }
        if ($graph_button.hasClass("is-flashing")) return;
        $graph_button.addClass("is-flashing");
        
        clearTimeout(VisualAssignment.notApplicableTimeouts[VisualAssignment.getGraphButtonID($graph_button)]);
        VisualAssignment.notApplicableTimeouts[VisualAssignment.getGraphButtonID($graph_button)] = setTimeout(() => {
            $graph_button.removeClass("is-flashing");
            switch ($graph_button.prop("tagName").toLowerCase()) {
                case "button":
                    $graph_button.text(original_text);
                    break;
                case "input":
                    $graph_button.attr("placeholder", original_text);
                    break;
            }
        }, VisualAssignment.BUTTON_ERROR_DISPLAY_TIME);
    }
    static getGraphButtonID($graph_button) {
        if (!$graph_button.attr("data-timeout-id")) $graph_button.attr("data-timeout-id", ++VisualAssignment.IDGeneratorCounter);
        return $graph_button.attr("data-timeout-id");
    }
    static monthLocales = ((locale) => {
        const locales = [];
        for(var i = 0; i < 12; i++) {
            locales[i] = new Date(2022, i).toLocaleString(locale, {month: "long"});
        }
        return locales;
    })([])
    static weekdayLocales = ((locale) => {
        const locales = {};
        for(var i = 0; i < 7; i++) {
            locales[new Date(2010, 0, i).getDay()] = new Date(2010, 0, i).toLocaleString(locale, {weekday: "long"});
        }
        return locales;
    })([])
    static formatDisplayInTextDate(date, display_year) {
        const month = VisualAssignment.monthLocales[date.getMonth()];
        const _date = date.getDate(); 
        const year = display_year ? ", " + date.getFullYear() : "";
        const weekday = VisualAssignment.weekdayLocales[date.getDay()];
        return `${month} ${_date}${year} (${weekday}):`;
    }
    setGraphButtonEventListeners() {
        // Turn off mousemove to ensure there is only one mousemove handler at a time
        let original_skew_ratio;
        this.graph.off(VisualAssignment.GRAPH_HOVER_EVENT).on(VisualAssignment.GRAPH_HOVER_EVENT, this.mousemove.bind(this))
        .on(isTouchDevice ? "touchend" : "click", e => {
            if (this.set_skew_ratio_using_graph) {
                // Runs if (set_skew_ratio_using_graph && draw_mouse_point || set_skew_ratio_using_graph && !draw_mouse_point)
                original_skew_ratio = undefined;
                this.set_skew_ratio_using_graph = false;
                skew_ratio_button.text(skew_ratio_button.attr("data-label")).blur();
                ajaxUtils.batchRequest("saveAssignment", ajaxUtils.saveAssignment, {skew_ratio: this.sa.skew_ratio, id: this.sa.id});
                ajaxUtils.batchRequest("saveAssignment", ajaxUtils.saveAssignment, {dynamic_start: this.sa.dynamic_start, id: this.sa.id});
                if (!this.draw_mouse_point && isTouchDevice) {
                    this.graph.off(VisualAssignment.GRAPH_HOVER_EVENT);
                }
                new Priority().sort();
            // if the user quickly taps the screen, instead of doing mousemove instead toggle draw point label on
            // toggle it off if the user clicks the same x coordinate or drags it around again
            } else if (!isTouchDevice || !this.allow_for_click_draw_point) {
                if (this.draw_mouse_point) {
                    // Runs if (!set_skew_ratio_using_graph && draw_mouse_point)
                    // Disable draw point
                    if (!isTouchDevice) {
                        this.graph.off(VisualAssignment.GRAPH_HOVER_EVENT);
                    }
                    this.draw_mouse_point = false;
                    const hover_point_label = this.dom_assignment.find(".hover-point-label");
                    hover_point_label.addClass("hide-label");
                    this.last_mouse_x = undefined; // force the graph to draw
                    this.draw();
                } else {
                    // Runs if (!set_skew_ratio_using_graph && !draw_mouse_point)
                    // Enable draw point
                    this.draw_mouse_point = true;
                    // Turn off mousemove to ensure there is only one mousemove handler at a time
                    this.graph.off(VisualAssignment.GRAPH_HOVER_EVENT).on(VisualAssignment.GRAPH_HOVER_EVENT, this.mousemove.bind(this));
                    // Pass in e because $.trigger makes e.pageX undefined
                    this.mousemove(e);
                }
            }
        });
        $(window).on("resize redrawGraphs", this.resize.bind(this));

        if (VIEWING_DELETED_ASSIGNMENTS) return; // EVERYTHING PAST THIS POINT ONLY RUNS IF VIEWING_DELETED_ASSIGNMENTS IS FALSE

        // might be easier to set the clicks to $(document) but will do later
        const skew_ratio_button = this.dom_assignment.find(".skew-ratio-button"),
                work_input_textbox = this.dom_assignment.find(".work-input-textbox"),
                submit_work_button = this.dom_assignment.find(".submit-work-button"),
                fixed_mode_button = this.dom_assignment.find(".fixed-mode-button"),
                display_in_text_button = this.dom_assignment.find(".display-in-text-button"),
                delete_work_input_button = this.dom_assignment.find(".delete-work-input-button");
        // BEGIN Up and down arrow event handler
        {
        let graphtimeout,
            arrow_key_fired = false, // $(document).keydown( fires for every frame a key is held down. This makes it behaves like it fires once
            graphinterval;

        // looking back i probably could have used e.originalEvent.repeat but uhhh it works ig
        $(document).keydown(e => {
            if ((e.key === "ArrowUp" || e.key === "ArrowDown") && !e.shiftKey && this.assignmentGraphIsOnScreen() && !arrow_key_fired) {
                // "arrow_key_fired" makes .keydown fire only when a key is pressed, not repeatedly
                arrow_key_fired = true;
                this.pressed_arrow_key = e.key;
                this.arrowSkewRatio();
                graphtimeout = setTimeout(function() {
                    clearInterval(graphinterval);
                    graphinterval = setInterval(this.arrowSkewRatio.bind(this), VisualAssignment.ARROW_KEYDOWN_INTERVAL);
                }.bind(this), VisualAssignment.ARROW_KEYDOWN_THRESHOLD);
            }
        }).keyup(e => {
            // Ensures the same key pressed fires the keyup to stop change skew ratio
            // Without this, you could press another key while the down arrow is being pressed for example and stop graphinterval
            if (e.key === this.pressed_arrow_key) {
                arrow_key_fired = false;
                clearTimeout(graphtimeout);
                clearInterval(graphinterval);
            }
        });
        }
        // END Up and down arrow event handler

        // BEGIN Display in text button
        this.in_graph_display = true;
        const graph_container = this.dom_assignment.find(".graph-container");
        const text_display_container = this.dom_assignment.find(".text-display-container");
        display_in_text_button.click(() => {
            this.in_graph_display = !this.in_graph_display;
            graph_container.toggleClass("text-display");
            display_in_text_button.text(display_in_text_button.attr(`data-${this.in_graph_display ? "in-text" : "in-graph"}-label`));
            if (this.in_graph_display) {
                text_display_container[0].innerHTML = "";
                return;
            }

            const len_works = this.sa.works.length - 1;
            const last_work_input = this.sa.works[len_works];
            const today_minus_assignment_date = mathUtils.daysBetweenTwoDates(date_now, this.sa.assignment_date);
            const add_last_work_input = len_works && last_work_input < this.sa.y && ![len_works + this.sa.blue_line_start, len_works + this.sa.blue_line_start - 1 /* if you finished your work for today dont show last work input */].includes(today_minus_assignment_date)
            const complete_due_date = new Date(this.sa.assignment_date.valueOf());
            complete_due_date.setDate(complete_due_date.getDate() + this.sa.complete_x);
            const display_year = this.sa.assignment_date.getFullYear() !== complete_due_date.getFullYear();
            const force_display_dates = [0, today_minus_assignment_date, this.sa.blue_line_start];
            if (add_last_work_input)
                force_display_dates.push(len_works + this.sa.blue_line_start - 1);
            const remove_zeroes = this.sa.x - this.sa.blue_line_start > 15;
            const unit_plural = pluralize(this.sa.unit);
            const unit_singular = pluralize(this.sa.unit, 1);
            const formatted_dates = [];
            
            let this_work;
            let next_work = this.sa.works[0];
            let this_funct;
            let next_funct;
            let diff;
            let today_index;
            let last_work_index;
            let total = this.sa.works[0];;
            let end_of_works = false;

            // assignment date
            if (this.sa.blue_line_start) {
                if (date_now.valueOf() === this.sa.assignment_date.valueOf()) {
                    today_index = 0;
                }
                formatted_dates.push(`<td>${VisualAssignment.formatDisplayInTextDate(this.sa.assignment_date, display_year)}</td><td colspan="6">&nbsp;(Assign Date)`);
            }
            let i;
            let date_i = new Date(this.sa.assignment_date.valueOf());
            date_i.setDate(date_i.getDate() + this.sa.blue_line_start);
            for (i = this.sa.blue_line_start; i < this.sa.complete_x; i++) {
                if (total === this.sa.y && remove_zeroes) {
                    break;
                }

                let formatted_date_i = VisualAssignment.formatDisplayInTextDate(date_i, display_year);
                date_i.setDate(date_i.getDate() + 1);
                if (end_of_works) {
                    if (last_work_input > next_funct) {
                        this_funct = last_work_input;
                    } else {
                        this_funct = next_funct;
                    }
                    next_funct = this.funct(i + 1);
                    diff = Math.max(0, mathUtils.sigFigSubtract(next_funct, this_funct));
                } else if (0 <= i - this.sa.blue_line_start + 1 && i - this.sa.blue_line_start + 1 <= len_works) {
                    this_work = next_work;
                    next_work = this.sa.works[i - this.sa.blue_line_start + 1];
                    diff = mathUtils.sigFigSubtract(next_work, this_work);
                } else if (this.sa.break_days.includes((this.assign_day_of_week + i) % 7)) {
                    diff = 0;
                } else {
                    end_of_works = true;
                    next_funct = this.funct(i + 1);
                    diff = mathUtils.sigFigSubtract(next_funct, last_work_input);
                }

                if (remove_zeroes && diff === 0 && !force_display_dates.includes(i)) continue;

                total += diff;
                let formatted_date = `<td>${formatted_date_i}</td> <td>&nbsp;${diff}</td> <td>${diff === 1 ? unit_singular : unit_plural}</td> <td>(${total}</td> <td>total)`;
                if (diff * this.sa.time_per_unit !== 0 && unit_singular.toLowerCase() !== "hour" && (unit_singular.toLowerCase() !== "minute" || diff * this.sa.time_per_unit >= 60))
                    formatted_date += ` (${utils.formatting.formatMinutes(diff * this.sa.time_per_unit)})`;
                if (today_minus_assignment_date == i)
                    today_index = formatted_dates.length;
                if (add_last_work_input && i === len_works + this.sa.blue_line_start - 1)
                    last_work_index = formatted_dates.length;

                formatted_dates.push(formatted_date);
            }
            // loops increment after the loop ends, so i is one too high
            i--;
            if (!this.sa.blue_line_start)
                formatted_dates[0] += '</td><td>&nbsp;(Assign Date)';
            if (formatted_dates[today_index] != null) // use != instead of !==
                formatted_dates[today_index] = "<td colspan=\"5\"><span class=\"today-display-in-text\"><hr>Today Line<hr></span></td></tr><tr class=\"scroll-to-top\">" + formatted_dates[today_index];
            if (add_last_work_input)
                formatted_dates[last_work_index] += ' (Last Work Input)';

            if (Math.floor(this.sa.complete_x) === i) {
                formatted_dates[formatted_dates.length - 1] += '</td><td>&nbsp;(Due Date)';
            } else {
                formatted_dates.push(`<td>${VisualAssignment.formatDisplayInTextDate(complete_due_date, display_year)}</td> <td colspan="6">&nbsp;(Due Date)`);
            }
            formatted_dates.push(`<td colspan="6">Curvature: ${mathUtils.precisionRound(this.sa.skew_ratio - 1, VisualAssignment.SKEW_RATIO_ROUND_PRECISION)}</td></tr>`);
            text_display_container[0].innerHTML = "<tr>" + formatted_dates.join("</td></tr><tr>");

            // scroll to today
            const scroll_to_top_tr = text_display_container.find("tr.scroll-to-top");
            if (scroll_to_top_tr.length) {
                const last_tr = text_display_container.find("tr:last-of-type");
                // first try to scroll to today
                let scroll_y = scroll_to_top_tr.offset().top - text_display_container.parent().offset().top;
                text_display_container.parent().scrollTop(scroll_y);
                // then add height if scrolling further isn't possible
                scroll_y = scroll_to_top_tr.offset().top - text_display_container.parent().offset().top;
                scroll_y += (text_display_container.parent().offset().top + text_display_container.parent().height()) - (last_tr.offset().top + last_tr.height());
                last_tr.css({height: "+=" + scroll_y, verticalAlign: "top"});
                // then scroll to today
                scroll_y = scroll_to_top_tr.offset().top - text_display_container.offset().top + parseFloat(text_display_container.parent().css("padding-top"));
                text_display_container.parent().scrollTop(scroll_y);
            }
        }).text(display_in_text_button.attr(`data-${this.in_graph_display ? "in-text" : "in-graph"}-label`));
        // END Display in text button

        // BEGIN Delete work input button
        {
        delete_work_input_button.click(() => {
            let len_works = this.sa.works.length - 1;
            if (!len_works) {
                VisualAssignment.flashNotApplicable(delete_work_input_button);
                return;
            }
            // Check out parabola.js for an explanation of what happens here

            // Make sure to update submit_work_input_button if this is changed
            if (len_works + this.sa.blue_line_start === this.sa.dynamic_start && !this.sa.fixed_mode) {
                const WLS = this.WLSWorkInputs();
                if (this.shouldAutotune() && !Number.isNaN(WLS)) {
                    for (let i = 0; i < Assignment.AUTOTUNE_ITERATIONS - 1; i++) {
                        this.setDynamicStart();
                        this.autotuneSkewRatio(WLS, {inverse: true});
                    }
                }
                this.autotuneSkewRatio(WLS, {inverse: true});
                this.sa.works.pop();
                len_works--;
                this.setDynamicStart();
            } else {
                this.sa.works.pop();
                len_works--;
            }
            ajaxUtils.batchRequest("saveAssignment", ajaxUtils.saveAssignment, {works: this.sa.works.map(String), id: this.sa.id});
            new Priority().sort();
        });
        }
        // END Delete work input button

        // BEGIN Work input textbox
        {
        let enter_fired = false;
        work_input_textbox.keydown(e => {
            if (e.key === "Enter" && !enter_fired) {
                enter_fired = true;
                submit_work_button.click();
            }
        // If you enter a number and press enter and the assignments sort, focus is removed from work_input_textbox and the keyup returns early
        // because e.target is now instead body
        // This can cause enter_fired to remain true and using enter to not work

        // THis ensures that enter_fired is appropriately changed if the assignments re sort
        }).on("blur", function() {
            enter_fired = false;
        });
        // an alert can sometimes cause the enter to be fired on another element, instead listen to the event's propagation to the root
        $(document).keyup(e => {
            if (!$(e.target).is(work_input_textbox)) return;

            if (e.key === "Enter") enter_fired = false;

            if (this.sa.needs_more_info) {
                VisualAssignment.flashNotApplicable(work_input_textbox);
                return;
            }
        });
        }
        // END Work input textbox

        // BEGIN Submit work button
        {
        submit_work_button.click(() => {
            if (this.sa.needs_more_info) {
                VisualAssignment.flashNotApplicable(submit_work_button);
                return;
            }

            const today_minus_assignment_date = mathUtils.daysBetweenTwoDates(date_now, this.sa.assignment_date);
            let len_works = this.sa.works.length - 1;
            let last_work_input = this.sa.works[len_works];
            let not_applicable_message_title;
            let not_applicable_message_description;
            if (!work_input_textbox.val()) {
                not_applicable_message_title = "Enter a Value.";
                not_applicable_message_description = "Please enter a number or keyword (which can be found in the <a href=\"/user-guide#standard-assignment-graph-controls\" target=\"_blank\">user guide</a>) into the textbox to submit a work input."
            } else if (last_work_input >= this.sa.y) {
                not_applicable_message_title = "Already Finished.";
                not_applicable_message_description = "You've already finished this assignment, so you can't enter any more work inputs.";
            }
            let todo = this.funct(len_works + this.sa.blue_line_start + 1) - last_work_input;
            let input_done = work_input_textbox.val().trim().toLowerCase();

            let use_in_progress = false;
            if (input_done.startsWith("today")) {
                input_done = input_done.replace("today", "").trim();
                use_in_progress = today_minus_assignment_date + 1 === len_works + this.sa.blue_line_start && today_minus_assignment_date >= 0; // last condition ensures the assignment has been assigned
            }
            if (input_done.startsWith("since")) {
                input_done = +input_done.replace("since", "").trim();
                if (isNaN(input_done)) {
                    not_applicable_message_title = "Invalid \"since\" format.";
                    not_applicable_message_description = "Please use the \"since\" keyword with the format: \"since [some number]\", with [some number] being your work input.";
                }
                const today_minus_assignment_date = mathUtils.daysBetweenTwoDates(date_now, this.sa.assignment_date);
                const array_length = today_minus_assignment_date - (this.sa.blue_line_start + len_works) - 1;
                if (array_length < 0) return;
                this.sa.works.push(...new Array(array_length).fill(last_work_input));
                len_works = this.sa.works.length - 1;
            } else
                switch (input_done) {
                    case "done":
                    case "fin":
                        if (use_in_progress) return;
                        input_done = Math.max(0, todo);
                        break;
                    default: {
                        input_done = +input_done;
                        if (isNaN(input_done)) {
                            if (use_in_progress) {
                                not_applicable_message_title = "Invalid \"today\" format.";
                                not_applicable_message_description = "Please use the \"today\" keyword with the format: \"today [input]\", with [input] being a valid work input.";
                            } else {
                                not_applicable_message_title = "Invalid Input.";
                                not_applicable_message_description = "Please enter a valid number or keyword into the textbox to submit a work input."
                            }
                        }
                    }
                }
            if (not_applicable_message_title) {
                $.alert({
                    title: not_applicable_message_title,
                    content: not_applicable_message_description,
                    onDestroy: () => work_input_textbox.focus(),
                });
                return;
            }
            // Clear once textbox if the input is valid
            work_input_textbox.val("");
            input_done = Math.floor(input_done * 100) / 100;
            // Cap at y and 0
            if (input_done + last_work_input > this.sa.y) {
                input_done = this.sa.y - last_work_input;
            } else if (input_done + last_work_input < 0) {
                input_done = -last_work_input;
            }
            last_work_input = mathUtils.precisionRound(last_work_input + input_done, 10);
            if (Math.abs(Math.round(last_work_input) - last_work_input) <= 1 / 100) {
                // Snap last_work_input to whole numbers (if unit is hour and last work input is 4.66666 but only 4.66 is displayed and you
                // enter 0.34, last_work_input will be 5.0066 making the conversion back to minutes 300.4 instead of just 300)
                last_work_input = Math.round(last_work_input);
            }

            if (use_in_progress) {
                if (this.sa.works[len_works] === last_work_input) return; // Pointless input (input_done === 0)

                // Attempts to undo the last work input to ensure the autotune isn't double dipped
                // Note that the inversing of the autotune algorithm is still not perfect, but usable

                // Make sure to update delete_work_input_button if this is changed
                if (len_works + this.sa.blue_line_start === this.sa.dynamic_start && !this.sa.fixed_mode) {
                    const WLS = this.WLSWorkInputs();
                    if (this.shouldAutotune() && !Number.isNaN(WLS)) {
                        for (let i = 0; i < Assignment.AUTOTUNE_ITERATIONS - 1; i++) {
                            this.setDynamicStart();
                            this.autotuneSkewRatio(WLS, {inverse: true});
                        }
                    }
                    this.autotuneSkewRatio(WLS, {inverse: true});
                    this.sa.works.pop();
                    len_works--;
                    this.setDynamicStart();
                } else {
                    this.sa.works.pop();
                    len_works--;
                }
            }
            this.sa.works.push(last_work_input);
            len_works++;

            // this.sa.x + 1 because the user can enter an earlier due date and cut off works at the due date, which messes up soft due dates without this
            if ([this.sa.x, this.sa.x + 1].includes(len_works + this.sa.blue_line_start) && last_work_input < this.sa.y
                && this.sa.soft)
                this.incrementDueDate();
            // Will never run if incrementDueDate() is called
            else if (len_works + this.sa.blue_line_start === this.sa.x + 1) {
                this.sa.works.pop();
                not_applicable_message_title = "End of Assignment.";
                not_applicable_message_description = "You've reached the end of this assignment; there are no more work inputs to submit.";
                $.alert({
                    title: not_applicable_message_title,
                    content: not_applicable_message_description,
                    onDestroy: () => work_input_textbox.focus(),
                });
                return;
            }

            // This check does nothing 100% of the time as todo is anyways 0 for break days

            // if (this.sa.break_days.includes((this.assign_day_of_week + this.sa.blue_line_start + len_works - 1) % 7)) {
            //     todo = 0;
            // }
            
            // +Add this check for setDynamicMode
            // -Old dynamic_starts, although still valid, may not be the closest value to len_works + this.sa.blue_line_start, and this can cause inconsistencies
            // +However, removing this check causes low skew ratios to become extremely inaccurate in dynamic mode,
                // Autotune and setDynamicStart somewhat fix this but fails with high minimum work times
            // -However, this isn't really that much of a problem; I can just call this a "feature" of dynamic mode in that it tries to make stuff linear. Disabling this makes dynamic mode completely deterministic in its red line start
            // +nm we kinda need this check or else dynamic mode makes like no sense at all, screw those "inconsistencies" i mentioned earlier i dont wanna make stuff unexpected for the user;
                // these inconsistencies are frankly not really that relevant, and dynamic mode is fine to not be completely deterministic
                // the fact that setDynamicStart uses a linear search algorithm now
                // almost guarantees calling it again will yield the same, current dynamic start

            // don't also forget to add this check to autofill all work done AND autofill no work done if i decide to remove it
            // don't also forget to rework delete_work_input_button and parabola.js if i decide to remove/modify it
            if (input_done !== todo && !this.sa.fixed_mode) {
                const WLS = this.WLSWorkInputs();
                if (this.shouldAutotune() && !Number.isNaN(WLS)) {
                    for (let i = 0; i < Assignment.AUTOTUNE_ITERATIONS; i++) {
                        this.setDynamicStart();
                        this.autotuneSkewRatio(WLS, {inverse: false});
                    }
                }
                this.setDynamicStart();
            }

            ajaxUtils.batchRequest("saveAssignment", ajaxUtils.saveAssignment, {works: this.sa.works.map(String), id: this.sa.id});
            
            if (SETTINGS.close_graph_after_work_input && this.dom_assignment.hasClass("open-assignment") && this.sa.blue_line_start + len_works === today_minus_assignment_date + 1)
                this.dom_assignment.click();
            new Priority().sort();
        });
        }
        // END Submit work button

        // BEGIN Set skew ratio using graph button
        {
        skew_ratio_button.click(() => {
            if (original_skew_ratio) {
                skew_ratio_button.text(skew_ratio_button.attr("data-label")).blur();
                this.set_skew_ratio_using_graph = false;
                this.sa.skew_ratio = original_skew_ratio;
                original_skew_ratio = undefined;
                if (!this.sa.fixed_mode)
                    this.setDynamicStart();
                this.draw();
                // No need to ajax since skew ratio is the same
                return;
            }
            if (this.getWorkingDaysRemaining({ reference: "visual red line start" }) <= 1 || this.sa.needs_more_info) {
                VisualAssignment.flashNotApplicable(skew_ratio_button);
                return;
            }
            original_skew_ratio = this.sa.skew_ratio;
            skew_ratio_button.text(skew_ratio_button.attr("data-active-label"));
            // Turn off mousemove to ensure there is only one mousemove handler at a time
            this.graph.off(VisualAssignment.GRAPH_HOVER_EVENT).on(VisualAssignment.GRAPH_HOVER_EVENT, this.mousemove.bind(this));
            this.graph.trigger(VisualAssignment.GRAPH_HOVER_EVENT);
            this.set_skew_ratio_using_graph = true;
        });
        if (isTouchDevice) {
            skew_ratio_button.attr("data-active-label", skew_ratio_button.attr("data-active-label-touch"));
        }
        }
        // END Set skew ratio button using graph button


        // BEGIN Fixed/dynamic mode button
        {
        fixed_mode_button.click(() => {
            if (this.sa.needs_more_info) {
                VisualAssignment.flashNotApplicable(fixed_mode_button);
                return;
            }

            this.sa.fixed_mode = !this.sa.fixed_mode;
            fixed_mode_button.text(fixed_mode_button.attr(`data-${this.sa.fixed_mode ? "dynamic" : "fixed"}-mode-label`));
            ajaxUtils.batchRequest("saveAssignment", ajaxUtils.saveAssignment, {fixed_mode: this.sa.fixed_mode, id: this.sa.id});
            if (this.sa.fixed_mode) {
                this.red_line_start_x = 0;
                this.red_line_start_y = 0;
            } else {
                this.red_line_start_x = this.sa.dynamic_start;
                this.red_line_start_y = this.sa.works[this.red_line_start_x - this.sa.blue_line_start];
                // Don't sa.autotuneSkewRatio() because we don't want to change the skew ratio when the user hasn't submitted any work inputs
                // However, we still need to call setDynamicStart() to compensate if the skew ratio in fixed mode was modified
                this.setDynamicStart();
            }
            new Priority().sort();
        }).text(fixed_mode_button.attr(`data-${this.sa.fixed_mode ? "dynamic" : "fixed"}-mode-label`));
        }
        // END Fixed/dynamic mode button        
    }

    positionTags() {
        const dom_tags = this.dom_assignment.find(".tags");
        if (VIEWING_DELETED_ASSIGNMENTS) {
            // we don't want to remove tags-left etc because of might mess up css positioning
            if (SETTINGS.horizontal_tag_position === "Middle")
                SETTINGS.horizontal_tag_position = "Left";
            if (dom_tags.hasClass("tags-middle"))
                dom_tags.removeClass("tags-middle").addClass("tags-left");
        }
        switch (SETTINGS.horizontal_tag_position) {
            case "Left": {
                if (SETTINGS.vertical_tag_position === "Top") {
                    dom_tags.removeClass("tags-top");
                    dom_tags.addClass("tags-bottom");
                }
                
                const dom_title = this.dom_assignment.find(".title");
                const dom_left_side_of_header = this.dom_assignment.find(".left-side-of-header");

                this.dom_assignment.css("--vertical-assignment-padding", "unset");
                // use offsetTop to ignore the transform scale
                let tag_top = dom_tags[0].offsetTop;
                let title_top = dom_left_side_of_header[0].offsetTop;
                let title_height = dom_left_side_of_header.height();
                if (SETTINGS.vertical_tag_position === "Bottom") {
                    var pseudo_height = dom_title.getPseudoStyle("::after", "height");
                    if (pseudo_height === "auto") {
                        pseudo_height = 0;
                    }
                    pseudo_height -= parseFloat(dom_title.css("--smush-daysleft"));
                } else if (SETTINGS.vertical_tag_position === "Top") {
                    var pseudo_height = dom_title.getPseudoStyle("::before", "height");
                    if (pseudo_height === "auto") {
                        pseudo_height = 0;
                    }
                    pseudo_height -= parseFloat(dom_title.css("--smush-priority"))
                }
                // Use Math.max so the height doesnt get subtracted if the psuedo element's height is 0
                title_height += Math.max(0, pseudo_height);

                // title_top + title_height - tag_top to first align the top of the tags with the bottom of the title
                const padding_to_add = title_top + title_height - tag_top + parseFloat(dom_tags.css("--tags-left--margin-bottom"));
                let original_padding = parseFloat($("#assignments-container").css("--vertical-assignment-padding"));
                this.dom_assignment.css("--vertical-assignment-padding", `${Math.max(0, padding_to_add) + original_padding}px`);

                if (SETTINGS.vertical_tag_position === "Top") {
                    dom_tags.addClass("tags-top");
                    dom_tags.removeClass("tags-bottom");
                }
                break;
            }

            case "Middle": {
                if (!dom_tags.parents(".align-to-status-message-container").length) {
                    dom_tags.prependTo(this.dom_assignment.find(".align-to-status-message-container"));
                }
                break;
            }
        }
    }
    displayTruncateWarning() {
        // remove for now
        return;
        const dom_left_side_of_header = this.dom_assignment.find(".left-side-of-header");
        dom_left_side_of_header.toggleClass("display-truncate-warning", dom_left_side_of_header.find(".description").hasOverflown());
    }
    canOpenAssignment() {
        return !this.sa.needs_more_info;
    }
}
window.VisualAssignment = VisualAssignment;
let already_ran_tutorial = false;
let prevent_click = false;
$(function() {
$(".assignment").click(function(e/*, params={ initUI: true }*/) {
    const target = $(e.target);
    const targetInFooter = !!target.parents(".assignment-footer").length; // only check the children not the actual element so the sides of an assignment can be clicked
    const targetInTags = !!target.parents(".tags").length || target.is(".tags");
    const targetInButton = !!target.parents(".assignment-header-button").length || target.is(".assignment-header-button");
    const targetInAnchor = !!target.parents(".title-link-anchor").length || target.is(".title-link-anchor");
    const dontFire = targetInTags || targetInButton || targetInAnchor || targetInFooter;
    if (dontFire || prevent_click) return;
    const dom_assignment = $(this);
    const sa = new VisualAssignment(dom_assignment);
    
    if (!sa.canOpenAssignment()) {
        dom_assignment.find(".update-button").click();
        return;
    }

    const assignment_footer = dom_assignment.find(".assignment-footer");
    // Close assignment
    if (dom_assignment.hasClass("open-assignment")) {
        // Animate the graph's margin bottom to close the assignment and make the graph's overflow hidden
        dom_assignment.addClass("assignment-is-closing").removeClass("open-assignment").css("overflow", "hidden");
        assignment_footer.find(".graph-footer *").attr("tabindex", -1);
        assignment_footer.animate({
            marginBottom: -assignment_footer.height(),
        }, VisualAssignment.CLOSE_ASSIGNMENT_TRANSITION_DURATION, "easeOutCubic", function() {
            // Hide graph when transition ends
            dom_assignment.css("overflow", "").removeClass("assignment-is-closing");
            assignment_footer.find(".graph-footer *").removeAttr("tabindex");
            assignment_footer.css({
                display: "",
                marginBottom: "",
                transition: "",
            });
            // Assignment name dom element can change height and the assignment header buttons can mess up their negative margins, so repoisiton the tags
            sa.positionTags();

            assignment_footer.trigger("transitionend");
        });
        sa.positionTags();
        dom_assignment.find(".falling-arrow-animation")[0]?.beginElement();
        return;
    }
    SETTINGS.one_graph_at_a_time && $(".assignment.open-assignment").click();
    
    // If the assignment was clicked while it was closing, stop the closing animation and open it
    assignment_footer.stop(false, true);
    dom_assignment.addClass("open-assignment");
    sa.positionTags();
    sa.displayTruncateWarning();
    assignment_footer.css("display", "block");
    dom_assignment.find(".rising-arrow-animation")[0]?.beginElement();
    sa.initUI();
    (() => {
        if (!SETTINGS.enable_tutorial || already_ran_tutorial || VIEWING_DELETED_ASSIGNMENTS) return;
        already_ran_tutorial = true;
        $("#tutorial-click-assignment-to-open").remove();

        const skip_in_debug = false;
        if (skip_in_debug) return;

        prevent_click = true;
        setTimeout(function() {
            const days_until_due = Math.floor(sa.sa.complete_x) - mathUtils.daysBetweenTwoDates(date_now, sa.sa.assignment_date);
            utils.ui.graphAlertTutorial(days_until_due);
            prevent_click = false;
        }, VisualAssignment.BUTTON_ERROR_DISPLAY_TIME);
    })();
});
});