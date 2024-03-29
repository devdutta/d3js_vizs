function show() {

    'use strict';

    // Generic setup, map is standard 960×500
    var margin = {top: 40, bottom: 10, right: 40, left: 10},
        width = 900 - margin.left - margin.right,
        height = 900 - margin.top - margin.bottom;

    // Canvas on which we draw the globe
    var canvas = d3.select(".chart")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)

    d3.select("#output")
        .attr("style", "padding-left: " + margin.left + "px; "
            + "padding-right: " + margin.right + "px; "
            + "padding-top: " + margin.top + "px; "
            + "paddin-bottom: " + margin.bottom + "px; "
            + "display: inline-block; ");

    // SVG element where we draw the legend
    var svg = d3.select(".legend")
        .attr("width", (width/2-100) + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)

    // create the canvas and assign the drag handler
    var c = canvas.node().getContext("2d");
    canvas.call(d3.drag().on("drag", dragged));

    // scale that returns the colors
    var colorScale = d3.scaleLinear().domain([0, 100]).range([0, 1]);
    // var color = function (i) { return d3.interpolateOranges(colorScale(i)) };
    var color = function (i) { return d3.interpolateBlues(colorScale(i)) };

    // setup the projection, and the path generator
    var projection = d3.geoOrthographic();
    // var projection = d3.geoGringortenQuincuncial();

    var path = d3.geoPath().projection(projection).context(c);

    // the topografies we'll render
    var f = {type: "Sphere"};
    // make the complete map fit into the designated width and height
    projection.fitSize([width, height], f)

    // Now load the data and when done call process to combine the data
    // and render it for the first time.
    var countries;
    var countryKV;

    d3.json("./data/world-110m-inet.json", function(loadedTopo) {
        // make the data available to the callbacks
        countries  = topojson.feature(loadedTopo, loadedTopo.objects.countries).features;

        console.log(countries)
        countryKV = countries.reduce(function (res, el) { res[el.id] = el; return res; }, {});

        // draw the map and the legend
        redrawWorld(countries);
        drawLegend(countries);
    });

    function drawLegend(countries) {
        // get the current ones
        var infos = svg.selectAll(".country-info")
            .data(countries.filter(function(d) {return d.properties.value && +d.properties.value > 0}));

        // create new ones
        var newInfos = infos.enter().append("g")
            .on("click", function(d) {
                d3.select(".country-text").text("Country: " + d.properties.name);
                d3.select(".country-value").text("Internet Users: " + (+d.properties.value).toFixed(2) + "%");
                moveTo(d.id)
            })
            .attr("class", "country-info")
            .attr("transform", function(d, i) {return "translate(" + ((i%9) * 40) + " " + (Math.floor(i/9) * 22 + 50) + " )"})
        newInfos.append("rect").attr("width", 35).attr("height", 20)
        newInfos.append("text").attr("dy", "15px").attr("dx", "17px")

        // set values for all
        var allInfos = newInfos.merge(infos);
        allInfos.select("rect")
            .attr("fill", function(d) { return color(d.properties.value); })

        allInfos.select("text")
            .attr("class", function(d) {
                return colorScale(+d.properties.value) > 0.4 ? "legend-text-white" : "legend-text-black"
            })
            .text(function(d) {return d.properties.countryA})

        svg.append("text").attr("class","country-text").attr("x",0).attr("y", 630)
        svg.append("text").attr("class","country-value").attr("x",0).attr("y", 660)
    }

    function dragged(e) {
        var oldRotate = projection.rotate();

        var change = [d3.event.dx / 8, d3.event.dy / 8];
        projection.rotate([oldRotate[0] + change[0], oldRotate[1] - change[1]]);
        redrawWorld();
    }

    function moveTo(country) {
        var countryToShow = (countryKV[country]);
        if (countryToShow) {
            var transition = d3.transition()
                .duration(2000)
                .tween("rotate", function () {
                    // var interpolator = d3.interpolate(projection.rotate(), d3.geoCentroid(countries[20]));
                    var target = d3.geoCentroid(countryToShow);
                    var interpolator = d3.interpolate(projection.rotate(), [-target[0], -target[1]]);
                    return function (t) {
                        projection.rotate(interpolator(t))
                        redrawWorld(countryToShow);
                    }
                });
        }
    }

    function redrawWorld(countryToShow) {
        c.clearRect(0, 0, width, height);
        drawOutline();
        countries.forEach(drawCountry);
        if (countryToShow) {
            highlightCountry(countryToShow);
        }
        drawGraticules();
    }

    function drawGraticules() {
        c.strokeStyle = "#666", c.lineWidth = 0.5, c.beginPath(), path(d3.geoGraticule()()), c.stroke();
    }

    function drawOutline() {
        c.strokeStyle = "#000", c.lineWidth = 2, c.beginPath(), path(f), c.stroke();
    }
    function highlightCountry(toDraw) {
        c.strokeStyle = "#000", c.lineWidth = 1, c.beginPath(), path(toDraw), c.stroke();
    }

    function drawCountry(toDraw) {
        if (toDraw.properties.value) {
            c.fillStyle = color(toDraw.properties.value), c.beginPath(), path(toDraw), c.fill();
        } else {
            c.fillStyle = '#ccc', c.beginPath(), path(toDraw), c.fill();
        }
    }
}
