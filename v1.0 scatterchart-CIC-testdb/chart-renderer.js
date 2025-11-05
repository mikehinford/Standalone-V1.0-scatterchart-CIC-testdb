/**
 * Chart Renderer Module
 * Handles Google Charts scatter chart rendering
 */

let chart = null;
let currentChartData = null;
let currentOptions = null;
let googleChartsReady = false;

// Load Google Charts and set up callback
google.charts.load('current', {packages: ['corechart']});
google.charts.setOnLoadCallback(() => {
  googleChartsReady = true;
  console.log('Google Charts loaded successfully');
});

/**
 * Draw scatter chart
 * @param {number} year - Selected year
 * @param {number} pollutantId - Selected pollutant ID
 * @param {Array} groupIds - Array of selected group IDs
 */
function drawScatterChart(year, pollutantId, groupIds) {
  // Wait for Google Charts to be ready
  if (!googleChartsReady) {
    console.log('Google Charts not ready yet, waiting...');
    google.charts.setOnLoadCallback(() => {
      googleChartsReady = true;
      drawScatterChart(year, pollutantId, groupIds);
    });
    return;
  }

  // Get data points
  const dataPoints = window.supabaseModule.getScatterData(year, pollutantId, groupIds);
  console.log('Chart renderer: got', dataPoints.length, 'data points');
  console.log('First data point:', dataPoints[0]);
  
  if (dataPoints.length === 0) {
    console.error('No data points returned!');
    showMessage('No data available for the selected year, pollutant, and groups.', 'error');
    return;
  }

  // Prepare Google DataTable
  const data = new google.visualization.DataTable();
  data.addColumn('number', 'Activity Data');
  data.addColumn('number', window.supabaseModule.getPollutantName(pollutantId));
  data.addColumn({type: 'string', role: 'tooltip'});
  data.addColumn({type: 'string', role: 'style'});

  // Add data rows with colors
  console.log('Adding', dataPoints.length, 'rows to chart data');
  dataPoints.forEach(point => {
    const color = window.Colors.getColorForGroup(point.groupName);
    const pollutantUnit = window.supabaseModule.getPollutantUnit(pollutantId); // Dynamically fetch pollutant unit
    // Create tooltip with fixed unit for Activity Data and dynamic unit for pollutant
    const tooltip = `${point.groupName}\nActivity: ${point.activityData.toLocaleString()} TJ\nPollutant Value: ${point.pollutantValue.toLocaleString()} ${pollutantUnit}`;
    
    data.addRow([
      point.activityData,
      point.pollutantValue,
      tooltip,
      `point {fill-color: ${color}; size: 8;}`
    ]);
  });
  
  console.log('Chart data rows added, now drawing chart...');

  // Chart options
  const pollutantName = window.supabaseModule.getPollutantName(pollutantId);
  const pollutantUnit = window.supabaseModule.getPollutantUnit(pollutantId);
  const activityUnit = window.supabaseModule.getPollutantUnit(window.supabaseModule.activityDataId);
  
  console.log('Chart renderer - Pollutant Name:', pollutantName);
  console.log('Chart renderer - Pollutant Unit:', pollutantUnit);
  console.log('Chart renderer - Activity Unit:', activityUnit);
  
  // Format title and axis labels with hyphens and spaces
  const chartTitle = `${pollutantName} - ${pollutantUnit}`;
  const yAxisTitle = chartTitle;
  const xAxisTitle = activityUnit ? `Activity Data - ${activityUnit}` : 'Activity Data';

  // Hide the HTML title element since we're using the chart's title
  // Create a custom title element with two lines
  const chartTitleElement = document.getElementById('chartTitle');
  if (chartTitleElement) {
    chartTitleElement.style.display = 'block';
    chartTitleElement.style.textAlign = 'center';
    chartTitleElement.style.marginBottom = '10px';

    // Add year as the first line
    const yearElement = document.createElement('div');
    yearElement.style.fontSize = '28px';
    yearElement.style.fontWeight = 'bold';
    yearElement.textContent = `${year}`;

    // Add pollutant and emission unit as the second line
    const pollutantElement = document.createElement('div');
    pollutantElement.style.fontSize = '20px';
    pollutantElement.textContent = `${yAxisTitle}`;

    // Clear previous content and append new elements
    chartTitleElement.innerHTML = '';
    chartTitleElement.appendChild(yearElement);
    chartTitleElement.appendChild(pollutantElement);
  }

  // Calculate dynamic height based on window size
  const chartHeight = Math.max(500, window.innerHeight * 0.8); // Increased minimum height and viewport percentage

  const chartDiv = document.getElementById('chart_div');
  if (!chartDiv) {
    console.error('Missing #chart_div element');
    showMessage('Chart container not found', 'error');
    return;
  }

  // Ensure the chart title is centered using CSS
  chartDiv.style.textAlign = 'center';

  currentOptions = {
    legend: { position: 'none' }, // Remove Google Chart legend
    title: '', // Invisible Google Chart title
    titleTextStyle: {
      fontSize: 0 // Minimize title space
    },
    chartArea: {
      top: 50, // Original top margin
      bottom: 50,
      left: '10%',
      width: '80%',
      height: '70%' // Original height
    },
    // backgroundColor: '#ffffff', // Commented out to allow CSS to control background color
    height: chartHeight,
    hAxis: {
      title: xAxisTitle,
      minValue: 0,
      format: 'short',
      gridlines: {
        count: 5 // Ensure visible gridlines for x-axis
      },
      titleTextStyle: {
        italic: false
      }
    },
    vAxis: {
      title: yAxisTitle,
      minValue: 0,
    }
  };

  // Debugging: Log the chart background color and computed styles
  if (chartDiv) {
    console.log('Chart background color (inline style):', chartDiv.style.backgroundColor);
    console.log('Chart background color (computed style):', window.getComputedStyle(chartDiv).backgroundColor);
  } else {
    console.error('#chart_div element not found');
  }

  // Log detailed information about data points and group IDs
  console.log('Selected group IDs:', groupIds);
  console.log('Data points:', dataPoints);

  // Log the final series configuration
  console.log('Final legend series configuration:', currentOptions.series);

  // Store current chart data for export
  currentChartData = {
    data: data,
    options: currentOptions,
    year: year,
    pollutantId: pollutantId,
    pollutantName: pollutantName,
    groupIds: groupIds,
    dataPoints: dataPoints
  };

  // Draw chart
  if (!chart) {
    chart = new google.visualization.ScatterChart(chartDiv);

    // Add listener for chart render completion (for loading management)
    google.visualization.events.addListener(chart, 'ready', () => {
      console.log('Google Charts ready event fired!');
      if (window.chartRenderCallback) {
        console.log('Scatter chart finished rendering');
        window.chartRenderCallback();
        window.chartRenderCallback = null; // Clear callback after use
      }
    });
    
    // Add error listener
    google.visualization.events.addListener(chart, 'error', (err) => {
      console.error('Google Charts error:', err);
    });

    // Ensure the default comparison statement is added after the chart is drawn
    google.visualization.events.addListener(chart, 'ready', () => {
      console.log('Chart is ready, adding default comparison statement.');
      setDefaultComparisonStatement();
    });
  }
  
  console.log('Calling chart.draw() with data rows:', data.getNumberOfRows());
  console.log('Chart options:', currentOptions);
  try {
    chart.draw(data, currentOptions);
    console.log('chart.draw() completed without error');

    // Create custom legend after chart is drawn
    createCustomLegend(chart, data, groupIds);
  } catch (err) {
    console.error('Error calling chart.draw():', err);
  }
  
  // Title is already set at the top of the function
  
  // Show chart with animation (add visible class to wrapper, not chart_div)
  const chartWrapper = document.querySelector('.chart-wrapper');
  if (chartWrapper) {
    chartWrapper.classList.add('visible');
  }
  
  // Enable share and download buttons
  const shareBtnEl = document.getElementById('shareBtn');
  const downloadBtnEl = document.getElementById('downloadBtn');
  if (shareBtnEl) shareBtnEl.disabled = false;
  if (downloadBtnEl) downloadBtnEl.disabled = false;

  // Track analytics
  if (window.Analytics && supabase) {
    window.Analytics.trackAnalytics(supabase, 'scatter_chart_drawn', {
      year: year,
      pollutant: pollutantName,
      group_count: groupIds.length
    });
  }

  clearMessage();
}

/**
 * Generate compare statement dynamically
 * @param {string} group1 - First group name
 * @param {string} group2 - Second group name
 * @param {number} pollutantId - Selected pollutant ID
 * @returns {string} Compare statement
 */
function generateCompareStatement(group1, group2, pollutantId) {
  const pollutantName = window.supabaseModule.getPollutantName(pollutantId);
  return `${group1} emit 20× the ${pollutantName} per TJ vs ${group2}`;
}

/**
 * Create a custom legend for the scatter chart
 * @param {Object} chart - Google Chart instance
 * @param {Object} data - Google DataTable instance
 * @param {Array} groupIds - Array of selected group IDs
 */
function createCustomLegend(chart, data, groupIds) {
  const legendContainer = document.getElementById('customLegend');
  if (!legendContainer) {
    console.error('Missing #customLegend element');
    return;
  }

  legendContainer.innerHTML = ''; // Clear existing legend
  legendContainer.style.display = 'flex';
  legendContainer.style.justifyContent = 'center'; // Center the legend
  legendContainer.style.flexWrap = 'wrap';
  legendContainer.style.gap = '10px';

  groupIds.forEach((groupId, index) => {
    const groupName = data.getValue(index, 2).split('\n')[0]; // Extract only the group name

    const legendItem = document.createElement('div');
    legendItem.className = 'legend-item';
    legendItem.style.display = 'flex';
    legendItem.style.alignItems = 'center';
    legendItem.style.cursor = 'pointer';
    legendItem.style.fontWeight = 'bold'; // Bold font for group name
    legendItem.style.margin = '1px'; // Minimize spacing around legend items

    const colorCircle = document.createElement('span');
    colorCircle.style.backgroundColor = window.Colors.getColorForGroup(groupName); // Revert to correct colors
    colorCircle.style.width = '12px';
    colorCircle.style.height = '12px';
    colorCircle.style.borderRadius = '50%'; // Circle shape
    colorCircle.style.marginRight = '8px';

    const label = document.createElement('span');
    label.textContent = groupName; // Display only the group name

    legendItem.appendChild(colorCircle);
    legendItem.appendChild(label);

    legendItem.addEventListener('click', () => {
      const series = chart.getOption('series');
      series[index].visibleInLegend = !series[index].visibleInLegend;
      chart.setOption('series', series);
      chart.draw(data, currentOptions);
    });

    legendContainer.appendChild(legendItem);
  });

  // Remove the blank line from the legend
  const blankLine = legendContainer.querySelector('div[style*="height: 20px"]');
  if (blankLine) {
    legendContainer.removeChild(blankLine);
  }

  // Move the comparison statement to the last line
  const legendDiv = document.getElementById('customLegend');
  if (legendDiv) {
    // Remove existing comparison statement if present
    const existingComparisonDiv = legendDiv.querySelector('.comparison-statement');
    if (existingComparisonDiv) {
      legendDiv.removeChild(existingComparisonDiv);
    }

    // Create a DOM element for the comparison statement
    const comparisonDiv = document.createElement('div');
    comparisonDiv.textContent = 'Comparison Statement';
    comparisonDiv.style.width = '100%'; // Force full width to be on its own line
    comparisonDiv.style.marginTop = '1px'; // Minimize spacing above the comparison statement
    comparisonDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    comparisonDiv.style.color = 'white';
    comparisonDiv.style.padding = '5px 10px';
    comparisonDiv.style.borderRadius = '15px';
    comparisonDiv.style.fontSize = '14px';
    comparisonDiv.style.textAlign = 'center';
    comparisonDiv.style.border = '2px dashed blue';
    comparisonDiv.style.flexBasis = '100%'; // Ensure it takes full width in flexbox

    // Append the comparison statement to the end
    legendDiv.appendChild(comparisonDiv);
    console.log('Comparison statement moved to the last line of the legend');
  } else {
    console.error('customLegend element not found');
  }
}

/**
 * Show a status message
 * @param {string} message - Message to display
 * @param {string} type - Message type: 'error', 'warning', 'info'
 */
function showMessage(message, type = 'info') {
  let messageDiv = document.getElementById('statusMessage');
  if (!messageDiv) {
    messageDiv = document.createElement('div');
    messageDiv.id = 'statusMessage';
    const chartWrapper = document.querySelector('.chart-wrapper');
    chartWrapper.parentNode.insertBefore(messageDiv, chartWrapper);
  }
  
  messageDiv.className = `status-message ${type}`;
  messageDiv.textContent = message;
  messageDiv.style.display = 'block';
}

/**
 * Clear status message
 */
function clearMessage() {
  const messageDiv = document.getElementById('statusMessage');
  if (messageDiv) {
    messageDiv.style.display = 'none';
  }
}

/**
 * Get current chart data for export
 * @returns {Object} Current chart data
 */
function getCurrentChartData() {
  return currentChartData;
}

/**
 * Get chart instance
 * @returns {Object} Google Chart instance
 */
function getChartInstance() {
  return chart;
}

// Modify the addComparisonSubtitle function to position the subtitle in the custom legend on the last line
function addComparisonSubtitle(statement) {
  const subtitleDiv = document.createElement('div');
  subtitleDiv.textContent = statement;
  subtitleDiv.style.marginTop = '10px';
  subtitleDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  subtitleDiv.style.color = 'white';
  subtitleDiv.style.padding = '5px 10px';
  subtitleDiv.style.borderRadius = '15px';
  subtitleDiv.style.fontSize = '14px';
  subtitleDiv.style.textAlign = 'center';

  // Ensure the customLegend element exists before appending the subtitle
  let legendDiv = document.getElementById('customLegend');
  if (!legendDiv) {
    console.error('customLegend element not found');
    legendDiv = document.createElement('div');
    legendDiv.id = 'customLegend';
    legendDiv.style.marginBottom = '10px';
    legendDiv.style.display = 'flex';
    legendDiv.style.flexWrap = 'wrap';
    legendDiv.style.gap = '10px';
    const chartDiv = document.getElementById('chart_div');
    if (chartDiv) {
      chartDiv.insertBefore(legendDiv, chartDiv.firstChild);
      console.log('customLegend element created and added to chart_div');
    } else {
      console.error('chart_div element not found');
    }
  }

  console.log('Subtitle div:', subtitleDiv);

  if (legendDiv) {
    legendDiv.appendChild(subtitleDiv);
    console.log('Subtitle appended to customLegend');
  } else {
    console.error('Failed to append subtitle to customLegend');
  }

  // Add debugging for computed styles and layout
  const legendDivDebug = document.getElementById('customLegend');
  if (legendDivDebug) {
    console.log('customLegend computed styles:', window.getComputedStyle(legendDivDebug));
    console.log('customLegend layout:', legendDivDebug.getBoundingClientRect());
  } else {
    console.error('customLegend element not found');
  }

  // Debugging: Log left and width values of subtitle and parent
  const subtitleDivDebug = document.querySelector('#customLegend > div:last-child');
  if (subtitleDivDebug) {
    console.log('Subtitle left:', window.getComputedStyle(subtitleDivDebug).left);
    console.log('Subtitle width:', window.getComputedStyle(subtitleDivDebug).width);

    // Force absolute positioning and adjust placement
    subtitleDivDebug.style.position = 'absolute';
    subtitleDivDebug.style.top = '10px';
    subtitleDivDebug.style.left = '50%';
    subtitleDivDebug.style.transform = 'translateX(-50%)';
  }

  // Debugging: Log overflow and z-index properties of customLegend and its parent
  const legendDivDebug2 = document.getElementById('customLegend');
  if (legendDivDebug2) {
    console.log('customLegend overflow:', window.getComputedStyle(legendDivDebug2).overflow);
    console.log('customLegend z-index:', window.getComputedStyle(legendDivDebug2).zIndex);

    const parentElement = legendDivDebug2.parentElement;
    if (parentElement) {
      console.log('Parent element overflow:', window.getComputedStyle(parentElement).overflow);
      console.log('Parent element z-index:', window.getComputedStyle(parentElement).zIndex);
    }

    // Add temporary borders to visualize boundaries
    legendDivDebug2.style.border = '2px dashed red';
    const subtitleDivDebug2 = document.querySelector('#customLegend > div:last-child');
    if (subtitleDivDebug2) {
      subtitleDivDebug2.style.border = '2px dashed blue';
    }
  }

  // Adjust parent element overflow and z-index
  const parentElement = legendDivDebug.parentElement;
  if (parentElement) {
    parentElement.style.overflow = 'visible';
    parentElement.style.zIndex = '10';
  }

  // Ensure customLegend has a higher z-index
  legendDivDebug.style.zIndex = '20';

  // Debugging: Log position and width of customLegend
  if (!legendDivDebug) {
    let legendDivDebug = document.getElementById('customLegend');
    if (legendDivDebug) {
      console.log('customLegend position:', window.getComputedStyle(legendDivDebug).position);
      console.log('customLegend width:', window.getComputedStyle(legendDivDebug).width);

      // Force relative positioning for customLegend
      legendDivDebug.style.position = 'relative';
    }
  }

  // Additional debugging for subtitle visibility
  const parentElementDebug = legendDivDebug.parentElement;
  if (parentElementDebug) {
    console.log('Parent element dimensions:', parentElementDebug.getBoundingClientRect());
    console.log('Parent element visibility:', window.getComputedStyle(parentElementDebug).visibility);
    console.log('Parent element display:', window.getComputedStyle(parentElementDebug).display);
    console.log('Parent element z-index:', window.getComputedStyle(parentElementDebug).zIndex);
  }

  console.log('Subtitle visibility:', window.getComputedStyle(legendDivDebug).visibility);
  console.log('Subtitle display:', window.getComputedStyle(legendDivDebug).display);
  console.log('Subtitle z-index:', window.getComputedStyle(legendDivDebug).zIndex);

  // Debugging: Verify subtitle element type and legend structure
  if (legendDivDebug) {
    console.log('customLegend children:', legendDivDebug.children);
    console.log('Subtitle element type:', subtitleDiv instanceof Node);
    console.log('Subtitle element:', subtitleDiv);

    try {
      legendDivDebug.appendChild(subtitleDiv);
      console.log('Subtitle successfully appended to customLegend.');
    } catch (error) {
      console.error('Error appending subtitle:', error);
    }
  }

  // Ensure customLegend is fully rendered before appending
  if (legendDivDebug) {
    console.log('customLegend visibility before append:', window.getComputedStyle(legendDivDebug).visibility);
    console.log('customLegend display before append:', window.getComputedStyle(legendDivDebug).display);

    // Validate subtitle element creation and fallback approach
    if (subtitleDiv instanceof HTMLElement) {
      try {
        legendDivDebug.appendChild(subtitleDiv);
        console.log('Subtitle successfully appended to customLegend.');

        // Force repaint/reflow
        legendDivDebug.style.display = 'none';
        legendDivDebug.offsetHeight; // Trigger reflow
        legendDivDebug.style.display = '';
        console.log('Repaint triggered for customLegend.');
      } catch (error) {
        console.error('Error appending subtitle:', error);
      }
    } else {
      console.warn('subtitleDiv is not a valid HTMLElement. Using innerHTML as fallback.');
      legendDivDebug.innerHTML += `<div style="margin-top: 10px; background-color: rgba(0, 0, 0, 0.5); color: white; padding: 5px 10px; border-radius: 15px; font-size: 14px; text-align: center; position: absolute; top: 10px; left: 50%; transform: translateX(-50%); border: 2px dashed blue;">Comparison Statement</div>`;
      console.log('Subtitle added using innerHTML fallback.');
    }
  }
}

// Isolate append logic and revalidate DOM state
function appendSubtitleToLegend(legendDiv, subtitleDiv) {
  console.log('Revalidating customLegend before append:', legendDiv);
  console.log('Revalidating subtitleDiv before append:', subtitleDiv);

  if (legendDiv instanceof HTMLElement && subtitleDiv instanceof HTMLElement) {
    try {
      legendDiv.appendChild(subtitleDiv);
      console.log('Subtitle successfully appended to customLegend.');

      // Force repaint/reflow
      legendDiv.style.display = 'none';
      legendDiv.offsetHeight; // Trigger reflow
      legendDiv.style.display = '';
      console.log('Repaint triggered for customLegend.');
    } catch (error) {
      console.error('Error appending subtitle:', error);
    }
  } else {
    console.warn('Invalid elements detected. Using innerHTML as fallback.');
    legendDiv.innerHTML += `<div style="margin-top: 10px; background-color: rgba(0, 0, 0, 0.5); color: white; padding: 5px 10px; border-radius: 15px; font-size: 14px; text-align: center; position: absolute; top: 10px; left: 50%; transform: translateX(-50%); border: 2px dashed blue;">Comparison Statement</div>`;
    console.log('Subtitle added using innerHTML fallback.');
  }
}

// Call isolated function
const legendDivDebug = document.getElementById('customLegend');
if (legendDivDebug) {
  // Prevent duplicate appends
  if (!legendDivDebug.querySelector('.subtitle')) {
    const subtitleDiv = document.createElement('div');
    subtitleDiv.className = 'subtitle';
    subtitleDiv.textContent = 'Comparison Statement';
    subtitleDiv.style.marginTop = '10px';
    subtitleDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    subtitleDiv.style.color = 'white';
    subtitleDiv.style.padding = '5px 10px';
    subtitleDiv.style.borderRadius = '15px';
    subtitleDiv.style.fontSize = '14px';
    subtitleDiv.style.textAlign = 'center';
    subtitleDiv.style.position = 'absolute';
    subtitleDiv.style.top = '10px';
    subtitleDiv.style.left = '50%';
    subtitleDiv.style.transform = 'translateX(-50%)';
    subtitleDiv.style.border = '2px dashed blue';

    appendSubtitleToLegend(legendDivDebug, subtitleDiv);
  } else {
    console.log('Subtitle already appended to customLegend.');
  }
} else {
  console.error('customLegend element not found. Cannot append subtitle.');
}

// Add a default comparison statement to the chart
function setDefaultComparisonStatement() {
  const defaultStatement = "Ecodesign - Ready To Burn emit X times PM2.5 pollution than Gas Boilers. With Gas Boilers providing X times more heat.";
  addComparisonSubtitle(defaultStatement);
}

// Call this function when the default graph is rendered
setDefaultComparisonStatement();

// Export chart renderer functions
window.ChartRenderer = {
  drawScatterChart,
  showMessage,
  clearMessage,
  getCurrentChartData,
  getChartInstance
};
