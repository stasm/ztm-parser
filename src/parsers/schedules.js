/*global require, module*/

'use strict';

var str = require('../utils/string.js'),
    doParseSchedule = require('./routes-and-schedules/schedule.js'),
    createRoutesParser = require('./routes-and-schedules/routes.js'),
    createLegendParser = require('./routes-and-schedules/legend.js'),

    NO_COURSE_KEY = '<< NIE KURSUJE >>';

/**
 *
 * @returns {{parseRoute: parseRoute, parseLegend: parseLegend, parseSchedule: parseSchedule, parseSchedulesForDayTypes: parseSchedulesForDayTypes, parseTransportLines: parseTransportLines, parseRoutesDescriptors: parseRoutesDescriptors, setDayTypes: setDayTypes, result: {lineTypeNames: Array, streets: Array, texts: {beginDateTexts: Array, commentTexts: Array, legendTexts: Array}, schedule: Array}}}
 */
function createSchedulesParser() {
    var routesParser = createRoutesParser(),
        legendParser = createLegendParser(),

        dayTypesMap = {},
        dayTypes = [],
        routes = [],
        departuresPerHour = [],
        legends = [],
        routesDescs = [],

        result = {
            lineTypeNames: [],
            streets: [],
            texts: {
                beginDateTexts: [],
                commentTexts: [],
                legendTexts: []
            },
            schedule: []
        };

    return {
        parseRoute: parseRoute,
        parseLegend: parseLegend,
        parseSchedule: parseSchedule,
        parseSchedulesForDayTypes: parseSchedulesForDayTypes,
        parseTransportLines: parseTransportLines,
        parseRoutesDescriptors: parseRoutesDescriptors,

        setDayTypes: setDayTypes,

        result: result
    };

    ////////////// IMPLEMENTATION

    function parseRoute(input) {
        routes.push(routesParser.parse(input));
    }

    function parseLegend(input) {
        legends.push(legendParser.parse(input));
    }

    function parseSchedule(input) {
        departuresPerHour.push(doParseSchedule(input));
    }

    function parseSchedulesForDayTypes(input) {
        dayTypes.push(str.splitByNL(input).map(parseDayType));
    }

    function parseDayType(input) {
        input = input.trim();
        return {
            noCourse: input.indexOf(NO_COURSE_KEY) !== -1,
            dayType: dayTypesMap[input.substring(0, 2)]
        };
    }

    function parseRoutesDescriptors(input) {
        routesDescs.push(str.splitByNL(input).map(parseRouteDescriptor));
    }

    function parseRouteDescriptor(input) {
        var parts = str.splitByLengths(
          input, [17, 8, 30, 6, 5, 30, 6, 10, 2, 7]);
        return {
            code: parts[0],
            dir: parts[8],
            lvl: parts[10],
            begin: {
                name: str.removeDelimiterAtEnd(parts[2], ','),
                city: parts[3],
            },
            end: {
                name: str.removeDelimiterAtEnd(parts[5], ','),
                city: parts[6],
            },
        };
    }

    function parseTransportLines(input) {
        str.splitByNL(input).forEach(parseTransportLine);

        result.streets = routesParser.streets;
        result.texts.beginDateTexts = legendParser.allBeginDateTexts;
        result.texts.commentTexts = legendParser.allCommentTexts;
        result.texts.legendTexts = legendParser.allLegendTexts;
    }

    function parseTransportLine(input) {
        var fields = str.splitByLengths(input, [10, 4, 2]),
            lineId = fields[1],
            lineTypeName = fields[3],
            lineTypeId = result.lineTypeNames.indexOf(lineTypeName);

        if (lineTypeId === -1) {
            lineTypeId = result.lineTypeNames.length;
            result.lineTypeNames.push(lineTypeName);
        }

        result.schedule.push({
            id: lineId,
            type: lineTypeId,
            routes: routesDescs.shift().map(buildRoute)
        });
    }

    function buildRoute(routeDesc) {
        return {
            code: routeDesc.code,
            dir: routeDesc.dir,
            lvl: routeDesc.lvl,
            begin: routeDesc.begin,
            end: routeDesc.end,
            stops: routes.shift().map(buildBusStopScheduleByDays)
        };
    }

    function buildBusStopScheduleByDays(busStop) {
        if (busStop.isSchedule) {
            busStop.schedulesByDays = dayTypes.shift().map(buildBusStopSchedule);
            busStop.legend = legends.shift();
            delete busStop.isSchedule;
        }
        return busStop;
    }

    function buildBusStopSchedule(dayType) {
        if (!dayType.noCourse) {
            dayType.departuresPerHour = departuresPerHour.shift();
            delete dayType.noCourse;
        }
        return dayType;
    }

    function setDayTypes(types) {
        var i;
        for (i = 0; i < types.length; i++) {
            dayTypesMap[types[i].code] = i;
        }
    }
}

module.exports = createSchedulesParser;
