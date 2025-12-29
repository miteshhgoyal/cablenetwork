import React, { useEffect, useState } from 'react';
import { View, FlatList, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { fetchChannels } from '../utils/iptv';
import IPTVPlayer from '../components/IPTVPlayer';

const PLAYLIST_URL = 'https://your-playlist-url.m3u'; // Replace with your M3U URL

const IPTVScreen = () => {
  const [channels, setChannels] = useState([]);
  const [selectedUrl, setSelectedUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChannels(PLAYLIST_URL)
      .then(items => setChannels(items))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      {selectedUrl && (
        <IPTVPlayer streamUrl={selectedUrl} />
      )}
      {loading ? (
        <ActivityIndicator color="#f97316" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={channels}
          keyExtractor={item => item.url}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => setSelectedUrl(item.url)} style={{ padding: 12 }}>
              <Text style={{ color: 'white', fontSize: 16 }}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

export default IPTVScreen;