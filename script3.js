d3.csv("Airbnb_Open_Data.csv").then(function(dataset) {
    d3.json("Boroughs.geojson").then(function(mapdata){

        var dimensions = {
            height: 350,
            width: 800,
            margin: {
                top: 50,
                bottom: 20,
                right: 10,
                left: 55
            }
        }

        dataset.forEach(d => {d.price = +d.price.replace(/[$,]/g, "")})
        dataset = dataset.filter(d => d.long < 0 && d.lat > 0 && +d.price > 0)

        var svg = d3.select("#Map")
                .style("width", dimensions.width)
                .style("height", dimensions.height)

        var projection = d3.geoEqualEarth()
                           .fitSize([dimensions.width, dimensions.height], mapdata)

        var pathGenerator = d3.geoPath(projection)
        
        // white = lower price -- Red = higher price
        var colorScale = d3.scaleSequential(d3.interpolateReds)
                           .domain(d3.extent(dataset, d => +d.price))

        var tooltip = d3.select("body")
                        .append("div")
                        .style("position", "absolute")
                        .style("background-color", "white")
                        .style("border", "1px solid black")
                        .style("border-radius", "5px")
                        .style("padding", "5px")
                        .style("pointer-events", "none")
                        .style("opacity", 0)

        var CurrentlySelectedBorough = null

        var boroughs = svg.append("g")
                          .selectAll(".boroughs")
                          .data(mapdata.features)
                          .enter()
                          .append("path")
                          .attr("class", "boroughs")
                          .attr("d", d => pathGenerator(d))
                          .attr("stroke", "black")
                          .attr("fill", "gray")
                          .on("mouseover", function(d, i){
                                if (CurrentlySelectedBorough !== this) {
                                    d3.select(this).style("stroke-width", "3")
                                }
                                tooltip.style("opacity", 1)
                                       .html(`<strong>Borough:</strong> ${i.properties['boro_name']}<br>`)
                                       .style("left", (d.pageX + 10) + "px")
                                       .style("top", (d.pageY + 10) + "px")
                           })
                           .on("mouseout", function(d, i){
                                if (CurrentlySelectedBorough !== this) {
                                    d3.select(this).style("stroke-width", "1")
                                }
                                tooltip.style("opacity", 0)
                           })
                           .on("click", function(d, i){
                                        d3.selectAll(".boroughs").style("stroke-width", "1")
                                                                 .style("stroke", "black")
                                        d3.select(this).style("stroke-width", "3")
                                                       .style("stroke", "blue")
                                        CurrentlySelectedBorough = this
                                        //update scatter plot code here
                                        updateScatterPlotByBorough(`${i.properties['boro_name']}`)
                                        updateMapByBorough(`${i.properties['boro_name']}`)
                                        updateBarChartByBorough(`${i.properties['boro_name']}`)
                            
                            })
        
        var points = svg.append("g")
                        .selectAll(".points")
                        .data(dataset)
                        .enter()
                        .filter(function(d) {
                            return mapdata.features.some(function(borough) {
                                return d3.geoContains(borough, [+d.long, +d.lat])
                            })
                        })
                        .append("circle")
                        .attr("class", "points")
                        .attr("cx", d => {
                            coords = projection([+d.long, +d.lat])
                            return coords ? coords[0] : null
                        })
                        .attr("cy", d => {
                            coords = projection([+d.long, +d.lat])
                            return coords ? coords[1] : null
                        })
                        .attr("r", 1.5)
                        .attr("fill", d => colorScale(+d.price))
                        .on("mouseover", function(d, i){
                            d3.select(this).style("stroke", "black")
                            let borough = mapdata.features.find(borough => 
                                d3.geoContains(borough, [+d.long, +d.lat])
                            )
                            d3.selectAll(".boroughs")
                            .filter(function(b) {
                                return b.properties['boro_name'] === i["neighbourhood group"]
                            })
                            .style("stroke-width", "3")
                            tooltip.style("opacity", 1)
                                .html(`
                                        <strong>Borough:</strong> ${i["neighbourhood group"]}<br>
                                        <strong>Neighborhood:</strong> ${i.neighbourhood}<br>
                                        <strong>Price:</strong> $${i.price}<br>
                                        <strong>Room Type:</strong> ${i["room type"]}<br>
                                        <strong>Review Rate Number:</strong> ${i["review rate number"]}<br>
                                        <strong>Construction Year:</strong> ${i["Construction year"]}<br>
                                    `)
                                .style("left", (d.pageX + 10) + "px")
                                .style("top", (d.pageY + 10) + "px")
                    })
                    .on("mouseout", function(d, i){
                            d3.select(this).style("stroke", "none")
                            tooltip.style("opacity", 0)
                            d3.selectAll(".boroughs").style("stroke-width", "1")
                    })
    //legend dimensions
        var legendWidth = 300;
        var legendHeight = 20;

        //used to position legend rectangle
        var legendX = dimensions.width - legendWidth - dimensions.margin.right - 5;   
        var legendY = dimensions.margin.top + 260;

        //append defs and a gradient for the legend
        var defs = svg.append("defs");

        var linearGradient = defs.append("linearGradient")
            .attr("id", "legend-gradient");

        linearGradient.selectAll("stop")
            .data(d3.range(0, 1.1, 0.1)) //divide into 10 stops
            .enter()
            .append("stop")
            .attr("offset", d => `${d * 100}%`)
            .attr("stop-color", d => colorScale(colorScale.domain()[0] + d * (colorScale.domain()[1] - colorScale.domain()[0])));

        //add a rect with the gradient
        svg.append("rect")
            .attr("x", legendX)
            .attr("y", legendY)
            .attr("width", legendWidth)
            .attr("height", legendHeight)
            .style("fill", "url(#legend-gradient)");

        //add legend axis
        var legendScale = d3.scaleLinear()
            .domain(colorScale.domain())
            .range([legendX, legendX + legendWidth]);

        var legendAxis = d3.axisBottom(legendScale)
            .ticks(6)
            .tickFormat(d3.format("$"));

        svg.append("g")
            .attr("class", "legend-axis")
            .attr("transform", `translate(0, ${legendY + legendHeight})`)
            .call(legendAxis);



        function updateListingsCount(count) {
            d3.select('#ListingsCount')
              .text(`Listings Count: ${count}`)
        }

        var zoom = d3.zoom()
                     .scaleExtent([1, 8])
                     .on("zoom", zoomed)

        svg.call(zoom)

        var filteredData = dataset
        var currentBorough = null
    
        function updateMapByBorough(selectedBorough) {

            currentBorough = selectedBorough
            currentNeighborhood = null

            if(currentNeighborhood === null && currentRoomType === null){
                filteredData = dataset.filter(d => {
                    return mapdata.features.some(borough =>
                        borough.properties['boro_name'] === selectedBorough &&
                        d3.geoContains(borough, [+d.long, +d.lat])
                    )
                })
            }
            else if(currentNeighborhood !== null && currentRoomType !== null) {
                filteredData = dataset.filter(d => {
                    return mapdata.features.some(borough =>
                        borough.properties['boro_name'] === selectedBorough &&
                        d3.geoContains(borough, [+d.long, +d.lat]) &&
                        d["room type"] === currentRoomType
                    )
                })
            }
            else if(currentRoomType !== null) {
                filteredData = dataset.filter(d => {
                    return mapdata.features.some(borough =>
                        borough.properties['boro_name'] === selectedBorough &&
                        d3.geoContains(borough, [+d.long, +d.lat]) &&
                        d["room type"] === currentRoomType
                    )
                })
            }
            else {
                filteredData = dataset.filter(d => {
                    return mapdata.features.some(borough =>
                        borough.properties['boro_name'] === selectedBorough &&
                        d3.geoContains(borough, [+d.long, +d.lat])
                    )
                })
            }

            svg.selectAll(".points").remove()
            
            svg.selectAll(".points")
                    .data(filteredData)
                    .enter()
                    .append("circle")
                    .attr("class", "points")
                    .attr("cx", d => {
                        let coords = projection([+d.long, +d.lat])
                        return coords ? coords[0] : null
                    })
                    .attr("cy", d => {
                        let coords = projection([+d.long, +d.lat])
                        return coords ? coords[1] : null
                    })
                    .attr("r", 1.5)
                    .attr("fill", d => colorScale(+d.price))
                    .on("mouseover", function(d, i){
                        d3.select(this).style("stroke", "black")
                        tooltip.style("opacity", 1)
                                .html(`
                                    <strong>Borough:</strong> ${i["neighbourhood group"]}<br>
                                    <strong>Neighborhood:</strong> ${i.neighbourhood}<br>
                                    <strong>Price:</strong> $${i.price}<br>
                                    <strong>Room Type:</strong> ${i["room type"]}<br>
                                    <strong>Review Rate Number:</strong> ${i["review rate number"]}<br>
                                    <strong>Construction Year:</strong> ${i["Construction year"]}<br>
                                `)
                                .style("left", (d.pageX + 10) + "px")
                                .style("top", (d.pageY + 10) + "px")
                    })
                    .on("mouseout", function(){
                        d3.select(this).style("stroke", "none")
                        tooltip.style("opacity", 0)
                    })

                    var borough = mapdata.features.find(b => b.properties['boro_name'] === selectedBorough)
                    var bounds = pathGenerator.bounds(borough)
                    var [[x0, y0], [x1, y1]] = bounds

                    svg.transition().duration(750).call(
                        zoom.transform,
                        d3.zoomIdentity
                            .translate(dimensions.width / 2, dimensions.height / 2)
                            .scale(Math.min(8, 0.9 / Math.max((x1 - x0) / dimensions.width, (y1 - y0) / dimensions.height)))
                            .translate(-(x0 + x1) / 2, -(y0 + y1) / 2),
                        [dimensions.width / 2, dimensions.height / 2]
                    )
                    
                    updateListingsCount(filteredData.length)
        }

        var currentNeighborhood = null

        function updateMapByNeighborhood(selectedNeighborhood) {

            currentNeighborhood = selectedNeighborhood

            if(currentBorough === null && currentRoomType === null){
                filteredData = dataset.filter(d => {
                    return d.neighbourhood === selectedNeighborhood
                })
            }
            else if(currentBorough !== null && currentRoomType !== null) {
                filteredData = dataset.filter(d => {
                    return d.neighbourhood === selectedNeighborhood &&
                    d["neighbourhood group"] === currentBorough &&
                    d["room type"] === currentRoomType
                })
            }
            else if(currentRoomType !== null) {
                filteredData = dataset.filter(d => {
                    return d.neighbourhood === selectedNeighborhood &&
                    d["room type"] === currentRoomType
                })
            }
            else {
                filteredData = dataset.filter(d => {
                    return d.neighbourhood === selectedNeighborhood &&
                    d["neighbourhood group"] === currentBorough
                })
            }

            svg.selectAll(".points").remove()
            
            svg.selectAll(".points")
                    .data(filteredData)
                    .enter()
                    .append("circle")
                    .attr("class", "points")
                    .attr("cx", d => {
                        let coords = projection([+d.long, +d.lat])
                        return coords ? coords[0] : null
                    })
                    .attr("cy", d => {
                        let coords = projection([+d.long, +d.lat])
                        return coords ? coords[1] : null
                    })
                    .attr("r", 1.5)
                    .attr("fill", d => colorScale(+d.price))
                    .on("mouseover", function(d, i){
                        d3.select(this).style("stroke", "black")
                        tooltip.style("opacity", 1)
                                .html(`
                                    <strong>Borough:</strong> ${i["neighbourhood group"]}<br>
                                    <strong>Neighborhood:</strong> ${i.neighbourhood}<br>
                                    <strong>Price:</strong> $${i.price}<br>
                                    <strong>Room Type:</strong> ${i["room type"]}<br>
                                    <strong>Review Rate Number:</strong> ${i["review rate number"]}<br>
                                    <strong>Construction Year:</strong> ${i["Construction year"]}<br>
                                `)
                                .style("left", (d.pageX + 10) + "px")
                                .style("top", (d.pageY + 10) + "px")
                    })
                    .on("mouseout", function(){
                        d3.select(this).style("stroke", "none")
                        tooltip.style("opacity", 0)
                    })

                    var borough = mapdata.features.find(b => b.properties['boro_name'] === currentBorough)
                    var bounds = pathGenerator.bounds(borough)
                    var [[x0, y0], [x1, y1]] = bounds

                    svg.transition().duration(750).call(
                        zoom.transform,
                        d3.zoomIdentity
                            .translate(dimensions.width / 2, dimensions.height / 2)
                            .scale(Math.min(8, 0.9 / Math.max((x1 - x0) / dimensions.width, (y1 - y0) / dimensions.height)))
                            .translate(-(x0 + x1) / 2, -(y0 + y1) / 2),
                        [dimensions.width / 2, dimensions.height / 2]
                    )

                    updateListingsCount(filteredData.length)
        }

        var roomTypeFilteredData = filteredData
        var currentRoomType = null

        function updateMapByRoomType(selectedRoomType) {

            currentRoomType = selectedRoomType

            if(currentBorough === null && currentNeighborhood === null){
                filteredData = dataset.filter(d => {
                    return d["room type"] === selectedRoomType
                })
            }
            else if(currentBorough !== null && currentNeighborhood !== null) {
                filteredData = dataset.filter(d => {
                    return d["room type"] === selectedRoomType &&
                    d["neighbourhood group"] === currentBorough &&
                    d.neighbourhood === currentNeighborhood
                })
            }
            else if(currentNeighborhood !== null) {
                filteredData = dataset.filter(d => {
                    return d["room type"] === selectedRoomType && d.neighbourhood === currentNeighborhood
                })
            }
            else {
                filteredData = dataset.filter(d => {
                    return d["room type"] === selectedRoomType &&
                    d["neighbourhood group"] === currentBorough
                })
            }

            svg.selectAll(".points").remove()
            
            svg.selectAll(".points")
                    .data(filteredData)
                    .enter()
                    .append("circle")
                    .attr("class", "points")
                    .attr("cx", d => {
                        let coords = projection([+d.long, +d.lat])
                        return coords ? coords[0] : null
                    })
                    .attr("cy", d => {
                        let coords = projection([+d.long, +d.lat])
                        return coords ? coords[1] : null
                    })
                    .attr("r", 1.5)
                    .attr("fill", d => colorScale(+d.price))
                    .on("mouseover", function(d, i){
                        d3.select(this).style("stroke", "black")
                        tooltip.style("opacity", 1)
                                .html(`
                                    <strong>Borough:</strong> ${i["neighbourhood group"]}<br>
                                    <strong>Neighborhood:</strong> ${i.neighbourhood}<br>
                                    <strong>Price:</strong> $${i.price}<br>
                                    <strong>Room Type:</strong> ${i["room type"]}<br>
                                    <strong>Review Rate Number:</strong> ${i["review rate number"]}<br>
                                    <strong>Construction Year:</strong> ${i["Construction year"]}<br>
                                `)
                                .style("left", (d.pageX + 10) + "px")
                                .style("top", (d.pageY + 10) + "px")
                    })
                    .on("mouseout", function(){
                        d3.select(this).style("stroke", "none")
                        tooltip.style("opacity", 0)
                    })

                    if(currentBorough !== null) {
                        var borough = mapdata.features.find(b => b.properties['boro_name'] === currentBorough)
                        var bounds = pathGenerator.bounds(borough)
                        var [[x0, y0], [x1, y1]] = bounds

                        svg.transition().duration(750).call(
                            zoom.transform,
                            d3.zoomIdentity
                                .translate(dimensions.width / 2, dimensions.height / 2)
                                .scale(Math.min(8, 0.9 / Math.max((x1 - x0) / dimensions.width, (y1 - y0) / dimensions.height)))
                                .translate(-(x0 + x1) / 2, -(y0 + y1) / 2),
                            [dimensions.width / 2, dimensions.height / 2]
                        )
                    }
                    
                    updateListingsCount(filteredData.length)
        }

        function zoomed(event) {
            const { transform } = event
            svg.select("g").attr("transform", transform)
            svg.selectAll(".points")
               .attr("transform", transform)
            svg.selectAll(".boroughs").attr("stroke-width", 1 / transform.k)
        }

        window.updateMapByNeighborhood = updateMapByNeighborhood
        window.updateMapByRoomType = updateMapByRoomType

        var title = svg.append("text")
                       .attr("x", 260)
                       .attr("y", dimensions.margin.top / 2)
                       .attr("text-anchor", "middle")
                       .style("font-size", "24px")
                       .text("Map of AirBNBs in NYC")

        var ListingsCount = svg.append('text')
                         .attr("id", 'ListingsCount')
                         .attr("x", 50)
                         .attr("y", 70)
                         .attr("dx", "-.8em")
                         .attr("dy", ".15em")
                         .attr("font-family", "sans-serif")
                         .text(`Listings Count: ${dataset.length}`)
    })
})
