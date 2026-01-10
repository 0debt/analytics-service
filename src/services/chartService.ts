/**
 * Generates a QuickChart.io URL for a pie chart with white text for dark themes.
 * @param data - Category to amount mapping
 * @returns Chart URL string
 */
export function generateChartUrl(data: Record<string, number>): string {
    // Filter values less than 0.01
    const cleanData = Object.entries(data)
        .filter(([_, value]) => value > 0.01)
        .reduce((acc, [key, val]) => ({ ...acc, [key]: val }), {});

    const labels = Object.keys(cleanData);
    const values = Object.values(cleanData);

    const chartConfig = {
        type: 'pie',
        data: {
            labels,
            datasets: [{ data: values }]
        },
        options: {
            // Legend configuration 
            legend: {
                labels: {
                    fontColor: '#FFFFFF',
                    fontSize: 14,
                    fontStyle: 'bold'
                }
            },
            // Data labels plugin configuration
            plugins: {
                datalabels: {
                    color: '#FFFFFF',
                    anchor: 'center',
                    align: 'center',
                    font: {
                        size: 14,
                        weight: 'bold'
                    }
                }
            }
        }
    };

    return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}`;
}

