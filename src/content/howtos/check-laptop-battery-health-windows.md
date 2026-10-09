---
# SAMPLE: placeholder how-to used to preview the how-to template.
title: 'How to check your laptop battery health in Windows (sample)'
description: 'Sample how-to. Generate a battery report in Windows to see how much capacity your laptop battery has lost.'
hub: computing
category: software
subcategory: windows
tags: [battery, how-to, sample]
author: asha-testwell
publishDate: 2026-09-18
heroImage: ../../assets/samples/computing-desk.jpg
heroAlt: Placeholder illustration of a laptop for the sample battery health how-to
sample: true
difficulty: easy
timeRequired: 5 minutes
worksOn: Windows 10 and 11
quickAnswer: 'Open Terminal, run powercfg /batteryreport, open the report it saves and compare Design capacity with Full charge capacity.'
tools: [A Windows laptop with admin access, A web browser to open the report]
steps:
  - title: Open a terminal
    body: Right-click the Start button and choose Terminal.
  - title: Create the report
    body: 'Type powercfg /batteryreport and press Enter. Windows saves an HTML report in your user folder.'
  - title: Open the saved report
    body: Copy the file path that Windows shows and paste it into your browser's address bar.
  - title: Compare the two capacities
    body: Open the report and compare Design capacity with Full charge capacity. The gap is how much the battery has worn.
    image: ../../assets/samples/computing-desk.jpg
    imageAlt: Placeholder illustration standing in for a screenshot of the battery report
    tip: Below about 80% of the design capacity you will notice shorter battery life.
troubleshooting:
  - q: '"Access denied" error'
    a: Open Terminal as administrator (right-click Start, then Terminal (Admin)) and run the command again.
  - q: The report shows no battery
    a: Your laptop may report the battery through a vendor driver. Update the chipset and battery drivers from the maker's site.
---

_This is sample content used to preview the how-to layout._

Batteries lose capacity as they age. A battery report tells you how much.
