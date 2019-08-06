/**
 * Created by jialing on 2017/7/15.
 */
import React, {Component} from 'react'
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TouchableHighlight,
  Dimensions,
  TextInput,
  Alert,
  Platform,
  WebView,
  SafeAreaView,
  PermissionsAndroid
} from 'react-native'
import _ from 'lodash'

const SCREEN_WIDTH = Dimensions.get('window').width
const SCREEN_HEIGHT = Dimensions.get('window').height

const MAP_MARGIN_TOP = 60
const MAP_WIDTH = SCREEN_WIDTH
const MAP_HEIGHT = SCREEN_HEIGHT / 3

const ICON_WIDTH = 30
const ICON_HEIGHT = 30

const patchPostMessageFunction = function () {
  var originalPostMessage = window.postMessage

  var patchedPostMessage = function (message, targetOrigin, transfer) {
    originalPostMessage(message, targetOrigin, transfer)
  }

  patchedPostMessage.toString = function () {
    return String(Object.hasOwnProperty).replace('hasOwnProperty', 'postMessage')
  }

  window.postMessage = patchedPostMessage
}

const patchPostMessageJsCode = '(' + String(patchPostMessageFunction) + ')();'

export default class AMap extends Component {
  constructor (props) {
    super(props)

    this.state = {
      loaded: false,

      geoInfo: undefined,

      positionResult: undefined,

      searchText: '',
      showSearchResult: false,
      searchResult: {
        error: 0,
        message: '',
        data: []
      }
    }
  }

  componentDidMount () {
    if (Platform.OS === 'android') {
      PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: '申请定位权限',
          message: '此App需要使用您的定位功能',
          buttonNeutral: '稍后提醒',
          buttonNegative: '拒绝',
          buttonPositive: '允许'
        }
      ).then(granted => {
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('granted ACCESS_FINE_LOCATION success')
        } else {
          console.log('granted ACCESS_FINE_LOCATION fail')
        }
      })
    }
  }

  _searchTextChange = _.debounce((text) => {
    this.setState({
      searchText: text
    })

    if (!text) {
      this._clearSearchInput()
      return
    }

    this._webview.postMessage(JSON.stringify({
      command: 'placeSearch',
      data: text
    }))
  }, 200)

  _clearSearchInput = () => {
    this.setState({
      searchText: '',
      showSearchResult: false,
      searchResult: {
        error: 0,
        message: '',
        data: []
      }
    })
  }

  _onSearchResultPress = (poiInfo) => {
    this.setState({
      searchText: poiInfo.name,
      showSearchResult: false
    })

    this._webview.postMessage(JSON.stringify({
      command: 'panTo',
      data: {
        lng: poiInfo.location.lng,
        lat: poiInfo.location.lat
      }
    }))
  }

  _onSearchInputFocus = () => {
    if (this.state.searchText)
      this.setState({
        showSearchResult: true
      })
  }

  _poiItemOnPress = (item) => {
    this._webview.postMessage(JSON.stringify({
      command: 'panTo',
      data: {
        lng: item.location.lng,
        lat: item.location.lat
      }
    }))
  }

  _renderSearchResult = () => {
    if (!this.state.showSearchResult) {
      return null
    }

    if (this.state.searchResult.error !== 0) {
      return (
        <View style={styles.noSearchResultContainer}>
          <Text style={styles.noSearchResultTxt}>{this.state.searchResult.message}</Text>
        </View>
      )
    }

    if (!this.state.searchResult.data) {
      return null
    }

    let searchResultsCustomStyle = {
      height: SCREEN_HEIGHT - 80
    }

    if (this.state.searchResult.data.length < 3) {
      searchResultsCustomStyle = {
        height: 70 * this.state.searchResult.data.length
      }
    }

    let resultView = this.state.searchResult.data.map((item, index) => {
      return (
        <TouchableOpacity key={index} onPress={() => {
          this._onSearchResultPress(item)
        }}>
          <View style={styles.searchResultContainer}>
            <View style={styles.searchResultRightContainer}>
              <Text numberOfLines={1} style={styles.searchResultName}>{item.district + item.name}</Text>
              <Text numberOfLines={1} style={styles.searchResultAddr}>{item.address}</Text>
            </View>
          </View>
        </TouchableOpacity>
      )
    })

    return (
      <View style={[styles.searchResultsContainer, searchResultsCustomStyle]}>
        <ScrollView>
          {resultView}
        </ScrollView>
      </View>
    )
  }

  _renderPoiList = () => {
    if (this.state.positionResult && this.state.positionResult.regeocode && this.state.positionResult.regeocode.pois)
      return (
        <ScrollView style={styles.poiListContainer}>
          {
            this.state.positionResult.regeocode.pois.map((item, index) => {
              if (index >= 10)
                return null
              return (
                <TouchableHighlight key={index} underlayColor="#ccc" onPress={() => {
                  this._poiItemOnPress(item)
                }}>
                  <View style={styles.poiItemContainer}>
                    <Text style={styles.poiItemName}>{item.name}</Text>
                    <Text style={styles.poiItemAddress}>{item.address}</Text>
                  </View>
                </TouchableHighlight>
              )
            })
          }
        </ScrollView>
      )
  }

  _submit = () => {
    if (!this.state.positionResult) return
    let lat = `纬度：${this.state.positionResult.position.lat}`
    let lng = `经度：${this.state.positionResult.position.lng}`
    let address = `地址：${this.state.positionResult.address}`

    Alert.alert('提示', `${lat}\n${lng}\n${address}`)
  }

  render () {
    //Android编译时不会打包html文件，因此使用require去加载html文件是无效的，可以放在assets文件夹中使用
    let source
    if (__DEV__) {
      source = require('./html/amap.html')
    } else if (Platform.OS === 'ios') {
      source = require('./html/amap.html')
    } else if (Platform.OS === 'android') {
      source = {uri: 'file:///android_asset/html/amap.html'}
    }

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.mapContainer}>
          <WebView
            ref={ref => this._webview = ref}
            style={{flex: 1}}
            source={source}
            domStorageEnabled={true}
            javaScriptEnabled={true}
            geolocationEnabled={true}
            originWhitelist={['*']}
            onMessage={this._handleMessage}
            onLoad={this._onLoad}
            injectedJavaScript={patchPostMessageJsCode}
          />
        </View>
        <View style={{paddingHorizontal: 10, paddingVertical: 5}}>
          {
            this.state.positionResult ?
              <Text style={{fontSize: 14, color: '#00aaff'}}>{'【已选择】' + this.state.positionResult.address}</Text> : null
          }
        </View>
        {this._renderPoiList()}
        <TouchableOpacity style={styles.btnSubmit} activeOpacity={0.8} onPress={this._submit}>
          <Text style={styles.btnText}>确定</Text>
        </TouchableOpacity>
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <TouchableOpacity onPress={() => {
              this._clearSearchInput()
            }}>
              <Text style={styles.searchInputLeftTxt}>取消</Text>
            </TouchableOpacity>
            <View style={styles.inputContainerStyle}>
              <TextInput
                ref={ref => this._searchInput = ref}
                onChangeText={(text) => this._searchTextChange(text)}
                placeholder="搜索地点"
                underlineColorAndroid="transparent"
                style={styles.inputStyle}
                onFocus={this._onSearchInputFocus}
              />
            </View>
          </View>
          {this._renderSearchResult()}
        </View>
      </SafeAreaView>
    )
  }

  _onLoad = () => {
    console.log('onLoad')
    //webview加载地图完毕，发送定位命令
    this._webview.postMessage(JSON.stringify({
      command: 'geolocation'
    }))

    this.setState({loaded: true})
  }

  _handleMessage = (event) => {
    console.log('_handleMessage')
    const msgData = JSON.parse(event.nativeEvent.data)
    console.log(msgData.command)
    switch (msgData.command) {
      case 'geolocation':
        if (msgData.code) {
          //定位成功
          if (!this.state.geoInfo) {
            // Alert.alert('提示','定位成功并移动中心点')
            this._webview.postMessage(JSON.stringify({
              command: 'panTo',
              data: {
                lng: msgData.result.position.lng,
                lat: msgData.result.position.lat
              }
            }))
          }
        } else {
          //定位失败
          Alert.alert('提示', '定位失败，您可以点击地图左下角小圆点重新定位')
        }
        break
      case 'positionResult':
        if (msgData.code) {
          //选址成功
          this.setState({
            positionResult: msgData.result
          })
        } else {
          //选址失败
        }
        break
      case 'placeSearch':
        let isOk = msgData.code === 'complete' && this._searchInput.isFocused()
        if (this.state.searchText) {
          this.setState({
            showSearchResult: true,
            searchResult: {
              error: isOk ? 0 : -1,
              message: isOk ? '' : '未查询到结果',
              data: isOk ? msgData.result.tips : []
            }
          })
        }
        break
    }
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    ...Platform.select({
      ios: {
        marginTop: 20
      },
      android: {
        marginTop: 0
      }
    })
  },
  mapContainer: {
    marginTop: MAP_MARGIN_TOP,
    width: MAP_WIDTH,
    height: MAP_HEIGHT
  },
  map: {
    flex: 1
  },
  mapMarker: {
    position: 'absolute',
    width: ICON_WIDTH,
    height: ICON_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center'
  },
  searchContainer: {
    position: 'absolute',
    top: 5,
    left: 5,
    right: 5,
    backgroundColor: 'white'
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#c8c7cc'
  },
  inputContainerStyle: {
    flex: 1,
    margin: 0,
    paddingHorizontal: 10,
    borderBottomWidth: 0,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: '#c8c7cc'
  },
  inputStyle: {
    height: 30,
    padding: 0,
    margin: 0
  },

  searchInputLeftTxt: {
    fontSize: 16,
    color: '#00aaff',
    paddingRight: 10
  },
  noSearchResultContainer: {
    padding: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#c8c7cc',
    borderTopWidth: 0
  },
  noSearchResultTxt: {
    fontSize: 18,
    color: '#030303'
  },
  searchResultsContainer: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#c8c7cc',
    borderTopWidth: 0
  },
  searchResultContainer: {
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#c8c7cc'
  },
  searchResultRightContainer: {
    flex: 1,
    paddingLeft: 20
  },
  searchResultName: {
    fontSize: 18,
    color: '#030303'
  },
  searchResultAddr: {
    fontSize: 12,
    color: '#b2b2b2',
    marginTop: 5
  },
  poiListContainer: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#c8c7cc'
  },
  poiItemContainer: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#999',
    paddingVertical: 5,
    justifyContent: 'center',
    alignItems: 'flex-start'
  },
  poiItemName: {
    fontSize: 16,
    color: '#000'
  },
  poiItemAddress: {
    fontSize: 14,
    color: '#999'
  },
  btnSubmit: {
    backgroundColor: '#00aaff',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 5,
    paddingVertical: 5,
    borderRadius: 4
  },
  btnText: {
    color: '#fff',
    fontSize: 18
  }
})
