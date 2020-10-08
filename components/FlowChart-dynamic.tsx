import React, { useState, useEffect, useReducer, useRef } from 'react';
import ReactFlow, { Background, addEdge } from 'react-flow-renderer';
import { nanoid } from 'nanoid';
import { Button, FormControl, FormLabel } from 'react-bootstrap';

import { useDispatch, useSelector } from 'react-redux';

import {
  setCompositionName,
  selectCompositionName,
} from '../store/reducers/executionReducer';

import { selectCurrentSequence } from '../store/reducers/sequenceReducer';
import {
  selectClickedFunc,
  setCurrentFunc,
} from '../store/reducers/functionsReducer';
import {
  setFlowRendererNodeId,
  selectFlowRendererNodeId,
} from '../store/reducers/canvasReducer';

import FlowName from './FlowName';

export const combineResult = (name, flowType, nodes = []) => {
  const tempFunc = nodes
    .filter((node) =>
      node.data !== undefined &&
      node.data.label !== 'start' &&
      node.data.label !== 'end'
        ? node.data.label
        : ''
    )
    .map((e) => e.data.funcID);
  return { name, type: flowType, func: tempFunc };
};

const BasicFlow = (props) => {
  const reduxDispatch = useDispatch();
  const compositionName = useSelector(selectCompositionName);
  const selectedCurrentSequence = useSelector(selectCurrentSequence);
  const selectedFunctions = useSelector(selectClickedFunc);
  let [nodes, setNodes] = useState([]);
  const canvasRef = useRef();
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const selectedFlowRendererNodeId = useSelector(selectFlowRendererNodeId);
  const onConnect = (elem) => setNodes((n) => addEdge(elem, n));

  let connector = (array, connectorNodeStyle) => {
    if (!array) return;
    let connectorBucket = [];

    if (selectedCurrentSequence.toString() == 'If Else') {
      for (let i = 0; i < array.length - 1; i++) {
        if (i < 2 || i == 3) {
          let connectorN = {
            id: 'connector-' + nanoid(),
            source: array[i].id,
            target: array[i + 1].id,
            ...connectorNodeStyle,
          };
          connectorBucket.push(connectorN);
        }
        if (i == 2 || i == 1) {
          let connectorN = {
            id: 'connector-' + nanoid(),
            source: array[i].id,
            target: array[i + 2].id,
            ...connectorNodeStyle,
          };
          connectorBucket.push(connectorN);
        }
      }
    } else if (selectedCurrentSequence.toString() == 'While loop') {
      for (let i = 0; i < array.length - 1; i++) {
        if (i < 1) {
          let connectorN = {
            id: 'connector-' + nanoid(),
            source: array[i].id,
            target: array[i + 1].id,
            ...connectorNodeStyle,
          };

          connectorBucket.push(connectorN);
        } else if (i == 1) {
          let style = {
            type: 'step',
            style: { stroke: '#f6ab6c' },
            animated: true,
            labelStyle: { fill: '#f6ab6c', fontWeight: 700 },
          };

          let connectorN = {
            id: 'connector-' + nanoid(),
            source: array[i].id,
            target: array[i + 2].id,
            ...style,
            animated: false,
            style: { stroke: '#bebebe' },
            labelStyle: { fill: '#777777', fontWeight: 700 },
            label: 'false',
          };
          let connectorTrue = {
            id: 'connector-' + nanoid(),
            source: array[i].id,
            target: array[i + 1].id,
            ...style,
            //
          };

          let connectorTrue2 = {
            // label: 'true',
            id: 'connector-' + nanoid(),
            source: array[i + 1].id,
            target: array[i].id,
            ...style,

            // type: 'output',
            type: 'smoothstep',
          };

          connectorBucket.push(connectorN);
          connectorBucket.push(connectorTrue);
          connectorBucket.push(connectorTrue2);
        }
      }
    } else if (selectedCurrentSequence.toString() == 'Try Catch') {
      for (let i = 0; i < array.length - 1; i++) {
        let connectorN = {
          id: 'connector-' + nanoid(),
          source: array[i].id,
          target: array[i + 1].id,
          ...connectorNodeStyle,
        };
        connectorBucket.push(connectorN);
      }
      let lastandN = {
        id: 'connector-' + nanoid(),
        source: array[1].id,
        target: array[3].id,
        ...connectorNodeStyle,
      };
      connectorBucket.push(lastandN);
    } else {
      for (let i = 0; i < array.length - 1; i++) {
        let connectorN = {
          id: 'connector-' + nanoid(),
          source: array[i].id,
          target: array[i + 1].id,
          ...connectorNodeStyle,
        };
        connectorBucket.push(connectorN);
      }
    }
    return connectorBucket;
  };

  let updateFunction = (element) => {
    if (!element && selectedFunctions.name != '') {
      return; //nodes;
    }
    setNodes((nodes) => {
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].id == selectedFlowRendererNodeId) {
          nodes[i]['data'] = {
            label: selectedFunctions.name,
            funcID: selectedFunctions.id,
          };
          nodes[i]['style'] = { background: '#8DA9C4' };
        }
      }
      return [...nodes];
    });
  };

  let addNodeSequence = () => {
    setNodes([]);
    let [arrayofNodes, style] = initNodes();
    let Y = canvasSize.height / 2;
    let startX = canvasSize.width - 85 + 70,
      endX = canvasSize.width - 5;
    const numOfNodes = 2;
    let result = [];
    for (let i = 0; i < numOfNodes; i++) {
      startX = endX - (startX + 85 + 180 * numOfNodes) / numOfNodes;
      result.push({
        id: nanoid(),
        data: { label: `Node ${i}` },
        width: 140,
        position: { x: startX, y: Y - 5 },
        style: {
          fontWeight: 400,
          fontSize: 15,
          background: '#eee',
          color: '#333',
        },
      });
    }

    let connectorNodeStyle = {
      animated: false,
      type: 'smoothstep',
      arrowHeadType: 'arrowclosed',
    };

    let addConnectorLines = connector(
      [arrayofNodes[0], ...result, arrayofNodes[1]],
      connectorNodeStyle
    );

    setNodes([
      arrayofNodes[0],
      ...result,
      arrayofNodes[1],
      ...addConnectorLines,
    ]);
  };

  const styleDefault = {
    background: '#333',
    color: '#fff',
    border: '1px solid #bbb',
    padding: 5,
  };

  let initNodes = () => {
    let s = {
      id: nanoid(),
      data: { label: 'start' },

      position: { x: 5, y: canvasSize.height / 2 },
      style: { ...styleDefault, width: 70 },
    };
    let e = {
      id: nanoid(),
      data: { label: 'end' },
      position: { x: canvasSize.width - 85, y: canvasSize.height / 2 },
      style: { ...styleDefault, width: 70 },
    };

    let connectorNodeStyle = {
      animated: false,
      type: 'smoothstep',
      arrowHeadType: 'arrowclosed',
      label: 'Select a flow on the left menu',
      style: { fontSize: '40px' },
      labelStyle: { fill: '#0B2545', fontWeight: 700, fontSize: '20px' },
    };
    return [[s, e], connectorNodeStyle];
  };

  let placementNode = () => {
    setNodes([]);
    let [arrayofNodes, style] = initNodes();
    if (nodes.length == 0 && canvasSize.width != 0) {
      let addConnectorLines = connector(arrayofNodes, style);
      setNodes([...arrayofNodes, ...addConnectorLines]);
    }
  };

  let addIfElseSequence = () => {
    setNodes([]);
    let [arrayofNodes, style] = initNodes();
    let Y = canvasSize.height / 2;
    let startX = canvasSize.width - 85 + 70,
      endX = canvasSize.width - 5;
    const numOfNodes = 3;
    let result = [];
    for (let i = 0; i < numOfNodes; i++) {
      if (i % 3 == 0) {
        Y = canvasSize.height / 2;
        startX = endX - (startX + 85 + 180 * numOfNodes) / numOfNodes - 100;
      } else if (i == 1) {
        Y = canvasSize.height / 2 - 50;
        startX += 190;
      } else {
        Y = canvasSize.height / 2 + 50;
        startX;
      }

      result.push({
        id: nanoid(),
        data: { label: `Node ${i}` },
        width: 140,
        position: { x: startX, y: Y - 5 },
        style: {
          fontWeight: 400,
          fontSize: 15,
          background: '#eee',
          color: '#333',
        },
      });
    }

    let connectorNodeStyle = {
      animated: false,
      type: 'smoothstep',
      arrowHeadType: 'arrowclosed',
    };

    let addConnectorLines = connector(
      [arrayofNodes[0], ...result, arrayofNodes[1]],
      connectorNodeStyle
    );

    setNodes([
      arrayofNodes[0],
      ...result,
      arrayofNodes[1],
      ...addConnectorLines,
    ]);
  };

  let addWhileSequence = () => {
    setNodes([]);
    let [arrayofNodes, style] = initNodes();
    let Y = canvasSize.height / 2;
    let startX = canvasSize.width - 85 + 70,
      endX = canvasSize.width - 5;
    const numOfNodes = 2;
    let result = [];
    for (let i = 0; i < numOfNodes; i++) {
      startX = endX - (startX + 85 + 180 * numOfNodes) / numOfNodes;
      if (i == 0) Y -= 100;
      else Y = canvasSize.height / 2;
      result.push({
        id: nanoid(),
        data: { label: `Node ${i}` },
        width: 140,
        position: { x: startX, y: Y - 5 },
        style: {
          fontWeight: 400,
          fontSize: 15,
          background: '#eee',
          color: '#333',
        },
        targetPosition: 'left',
      });
    }

    let connectorNodeStyle = {
      animated: false,
      type: 'smoothstep',
      arrowHeadType: 'arrowclosed',
    };

    let addConnectorLines = connector(
      [arrayofNodes[0], ...result, arrayofNodes[1]],
      connectorNodeStyle
    );

    setNodes([
      arrayofNodes[0],
      ...result,
      arrayofNodes[1],
      ...addConnectorLines,
    ]);
  };

  let tryCatchSequence = () => {
    setNodes([]);
    let [arrayofNodes, style] = initNodes();
    let Y = canvasSize.height / 2;
    let startX = 0, //canvasSize.width - 85 + 140,
      endX = canvasSize.width - 5;
    const numOfNodes = 3;
    let result = [];
    for (let i = 0; i < numOfNodes; i++) {
      startX += 45 + (endX - 85) / (numOfNodes + 3);
      //endX - (startX + 85 + 140 + 70 * numOfNodes) / numOfNodes;
      if (i == 1) Y -= 100;
      else Y = canvasSize.height / 2;

      result.push({
        id: nanoid(),
        data: { label: `Node ${i}` },
        width: 140,
        position: { x: startX, y: Y - 5 },
        style: {
          fontWeight: 400,
          fontSize: 15,
          background: '#eee',
          color: '#333',
        },
        targetPosition: 'left',
      });
    }

    let connectorNodeStyle = {
      animated: false,
      type: 'smoothstep',
      arrowHeadType: 'arrowclosed',
    };

    let addConnectorLines = connector(
      [arrayofNodes[0], ...result, arrayofNodes[1]],
      connectorNodeStyle
    );

    setNodes([
      arrayofNodes[0],
      ...result,
      arrayofNodes[1],
      ...addConnectorLines,
    ]);
  };

  const resultFunc = combineResult(
    compositionName,
    selectedCurrentSequence,
    nodes
  );

  const onElementClick = (event, element) => {
    reduxDispatch(setFlowRendererNodeId(element.id));
    //reduxDispatch(setCurrentFunc({ id: '', name: '' }));
    //console.log('CLICK', event, element);
    if (element.id) {
      updateFunction(element);
    }
  };

  function changeCompositionName(name) {
    reduxDispatch(setCompositionName(name));
  }

  useEffect(() => {
    if (canvasRef.current) {
      setCanvasSize({
        width: canvasRef.current.offsetWidth,
        height: canvasRef.current.offsetHeight,
      });
    }
    if (canvasSize.width != 0) {
      placementNode();
    }
    if (selectedCurrentSequence.toString() == 'Sequence') {
      addNodeSequence();
    } else if (selectedCurrentSequence.toString() == 'If Else') {
      addIfElseSequence();
    } else if (selectedCurrentSequence.toString() == 'While loop') {
      addWhileSequence();
    } else if (selectedCurrentSequence.toString() == 'Try Catch') {
      tryCatchSequence();
    }
  }, [canvasSize.width, selectedCurrentSequence]);
  return (
    <div>
      <div ref={canvasRef}>
        <ReactFlow
          elements={nodes}
          style={{ background: 'white', width: '100%', height: '300px' }}
          onElementClick={onElementClick}
          onConnect={onConnect}
        >
          <Background color="#ccc" gap={3} />
        </ReactFlow>
      </div>
      <FlowName
        onSave={() => {
          props.onSave(resultFunc);
        }}
        onChange={(name) => {
          changeCompositionName(name);
        }}
        compositionName={compositionName}
      />
    </div>
  );
};

export default BasicFlow;
