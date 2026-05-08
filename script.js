const mainGrid = document.getElementById('main-grid');
const cellSelected = [];

const cellSelectedElement = document.getElementById('cell-selected');
function updateSelectedCellsElement() {
    cellSelectedElement.textContent = `Selected Cells: ${cellSelected.map(cell => `(${cell[0]},${cell[1]})`).join(', ')}`;
}

const groupedCellSelectedElement = document.getElementById('grouped-cell-selected');
function updateGroupedSelectedCellsElement(groupedCells) {
    groupedCellSelectedElement.textContent = `Grouped Selected Cells: ${groupedCells.map((group, i) => `Group ${i + 1}: ${group.map(([x, y]) => `(${x},${y})`).join(', ')}`).join(', ')}`;
}

for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
        const div = document.createElement('div');
        div.textContent = `(${x},${y})`;
        
        div.addEventListener('click', () => {
            const coords = [x, y];
            const index = cellSelected.findIndex(cell => cell[0] === x && cell[1] === y);
            
            if (index === -1) {
                cellSelected.push(coords);
            } else {
                cellSelected.splice(index, 1);
            }

            updateSelectedCells();
        });
        mainGrid.appendChild(div);
    }
}

function groupConnectedCells(cells) {
    const visited = new Set();
    const groups = [];
    
    const getKey = (x, y) => `${x},${y}`;
    const cellSet = new Set(cells.map(c => getKey(c[0], c[1])));
    
    for (const cell of cells) {
        const key = getKey(cell[0], cell[1]);
        if (visited.has(key)) continue;
        
        const group = [];
        const queue = [cell];
        visited.add(key);
        
        while (queue.length > 0) {
            const [x, y] = queue.shift();
            group.push([x, y]);
            [[x-1, y], [x+1, y], [x, y-1], [x, y+1]].forEach(([nx, ny]) => {
                const nKey = getKey(nx, ny);
                if (cellSet.has(nKey) && !visited.has(nKey)) {
                    visited.add(nKey);
                    queue.push([nx, ny]);
                }
            });
        }
        
        groups.push(group);
    }
    
    return groups;
}

function getColor(index, maxColors) {
    const hue = (index / maxColors) * 360;
    return `hsl(${hue}, 100%, 50%)`;
}

function updateSelectedCellColor(groupedCells) {
    
    document.querySelectorAll('#main-grid div').forEach(div => {
        div.style.backgroundColor = 'white';
    });
    
    groupedCells.forEach((group, groupIndex) => {
        const color = getColor(groupIndex, groupedCells.length);
        group.forEach(([x, y]) => {
            const div = document.querySelector(`#main-grid div:nth-child(${y * 10 + x + 1})`);
            if (div) div.style.backgroundColor = color;
        });
    });
}

const calculateAssociatePolygonCorners = (() => {

    const RIGHT = 0b00;
    const DOWN = 0b01;
    const LEFT = 0b10;
    const UP = 0b11;
    const ERROR = -1;
    const DIRECTIONS_MAPPING_TABLE = [
        ERROR, UP   , ERROR, RIGHT, DOWN , ERROR, DOWN , ERROR, ERROR, UP   , ERROR, DOWN , RIGHT, ERROR, UP   , ERROR,
        ERROR, LEFT , RIGHT, ERROR, ERROR, DOWN , RIGHT, ERROR, ERROR, LEFT , DOWN , ERROR, ERROR, RIGHT, LEFT , ERROR,
        ERROR, ERROR, UP   , LEFT , ERROR, ERROR, UP   , DOWN , DOWN , DOWN , ERROR, ERROR, LEFT , UP   , ERROR, ERROR,
        ERROR, ERROR, ERROR, ERROR, LEFT , UP   , LEFT , RIGHT, RIGHT, RIGHT, UP   , LEFT , ERROR, ERROR, ERROR, ERROR
    ];

    return function(cells) {
        const minX = Math.min(...cells.map(c => c[0]));
        const maxX = Math.max(...cells.map(c => c[0]));
        const minY = Math.min(...cells.map(c => c[1]));
        const maxY = Math.max(...cells.map(c => c[1]));
        const sizeX = maxX - minX + 1;
        const sizeY = maxY - minY + 1;
        const offsetedGrid = Array.from({ length: sizeY + 1 }, () => Array(sizeX + 1).fill(0));
        cells.forEach(([x, y]) => {
            offsetedGrid[y - minY][x - minX] |= 0b1000;
            offsetedGrid[y - minY][x - minX + 1] |= 0b0100;
            offsetedGrid[y - minY + 1][x - minX] |= 0b0010;
            offsetedGrid[y - minY + 1][x - minX + 1] |= 0b0001;
        });
        const maxLoop = 100000;
        let loopCount = 0;
        let x = 0;
        let y = Math.min(...cells.filter(c => c[0] === minX).map(c => c[1])) - minY;
        let direction = UP;
        const startingPoint = [x + minX, y + minY];
        const corners = [];
        do {
            loopCount++;
            const newDirection = DIRECTIONS_MAPPING_TABLE[direction << 4 | offsetedGrid[y][x]];
            if (newDirection === ERROR) {
                throw new Error(`Invalid grid configuration at (${x + minX}, ${y + minY}) with direction ${direction}`);
            }
            if (newDirection !== direction) {
                direction = newDirection;
                corners.push([x + minX, y + minY]);
            }
            if (direction === RIGHT) x++;
            else if (direction === DOWN) y++;
            else if (direction === LEFT) x--;
            else if (direction === UP) y--;
        } while (loopCount < maxLoop && (x + minX !== startingPoint[0] || y + minY !== startingPoint[1]));
        return corners;
    }
})();

function updateSvgPolygons(polygonCorners) {
    const svgGrid = document.getElementById('svg-grid');
    svgGrid.innerHTML = '';

    polygonCorners.forEach((corners, groupIndex) => {
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', corners.map(([x, y]) => `${x},${y}`).join(' '));
        polygon.setAttribute('fill', getColor(groupIndex, polygonCorners.length));
        svgGrid.appendChild(polygon);
    });
}

function updateSelectedCells() {
    updateSelectedCellsElement();
    const groupedCells = groupConnectedCells(cellSelected);
    updateGroupedSelectedCellsElement(groupedCells);
    updateSelectedCellColor(groupedCells);
    const polygonCorners = groupedCells.map(group => calculateAssociatePolygonCorners(group));
    updateSvgPolygons(polygonCorners);
}



updateSelectedCells();